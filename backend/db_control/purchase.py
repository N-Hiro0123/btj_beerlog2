import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func


from db_control.mymodels import Purchase, PurchaseDetail, EC_Brand, Brand
from db_control.connect import get_db
from db_control.token import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException, Query

from db_control.schemas import PurchaseSetItem, TransactionResponse, ECSearchResult, Purchaselog, PurchaseItem, PurchaselogPage
from typing import List
import base64

# from .mymodels import Survey, Brand, Preference, User, EC_Brand, EC_Set

from scipy.spatial.distance import cosine
from datetime import date, datetime

router = APIRouter()


@router.post("/purchase", response_model=TransactionResponse)
def create_purchase(purchase: List[PurchaseSetItem], db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    try:
        total_amount = 0

        # print("Starting transaction processing...")

        # print(f"Received purchase data: {purchase}")

        # 取引テーブルへ登録
        transaction = Purchase(
            user_id=user_id,
            date_time=datetime.now(),
            total_amount=0,
            total_cans=sum(item.setDetails.cans for item in purchase),
            survey_completion=False,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        purchase_id = transaction.purchase_id

        # 取引明細へ登録
        detail_id = 0
        for id1, set in enumerate(purchase):
            # ナショナルについて書き込み
            for id2, item in enumerate(set.national_set.details):
                for count in range(item.count):
                    detail_id += 1
                    detail = PurchaseDetail(
                        purchase_id=purchase_id,
                        ec_set_id=item.ec_set_id,
                        detail_id=detail_id,
                        ec_brand_id=item.ec_brand_id,
                        category=item.category,
                        name=item.name,
                        price=item.price,
                    )
                    db.add(detail)
                    total_amount += item.price
                    # ナショナルについて書き込み

            for id2, item in enumerate(set.craft_set.details):
                for count in range(item.count):
                    detail_id += 1
                    detail = PurchaseDetail(
                        purchase_id=purchase_id,
                        ec_set_id=item.ec_set_id,
                        detail_id=detail_id,
                        ec_brand_id=item.ec_brand_id,
                        category=item.category,
                        name=item.name,
                        price=item.price,
                    )
                    db.add(detail)
                    total_amount += item.price

        # 取引テーブルを更新
        transaction.total_amount = total_amount
        db.commit()

    except Exception as e:
        db.rollback()
        # print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

    return TransactionResponse(total_amount=total_amount)


def search_ec_brands_by_brand_name(db: Session, search_term: str):
    # Step 1: Brandテーブルから該当するbrand_idを取得
    brand_ids = db.query(Brand.brand_id).filter(Brand.brand_name.ilike(f'%{search_term}%')).all()

    brand_ids = [brand_id[0] for brand_id in brand_ids]

    if not brand_ids:
        return []  # 検索結果がない場合は空のリストを返す

    # Step 2: EC_Brandテーブルから該当するbrand_idを含む行を取得
    ec_brands = db.query(EC_Brand).filter(EC_Brand.brand_id.in_(brand_ids)).all()

    # Step 3: ECSearchResultに変換する
    # responsemodelで型を指定しておけば自動で変換してくれるようだが、明示的に変換しておく
    ec_search_results = [
        ECSearchResult(
            ec_brand_id=ec_brand.ec_brand_id,
            name=ec_brand.name,
            category=ec_brand.category,
            description=ec_brand.description,
            price=ec_brand.price,
        )
        for ec_brand in ec_brands
    ]

    return ec_search_results


@router.get("/search_ec_brands", response_model=List[ECSearchResult])
def search_brands(search_term: str, db: Session = Depends(get_db)):
    brands = search_ec_brands_by_brand_name(db, search_term=search_term)
    if not brands:
        raise HTTPException(status_code=404, detail="Brands not found")
    return brands


@router.get("/purchaselog", response_model=PurchaselogPage)
def get_purchaselog(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    page: int = 1,  # デフォルト値として1ページ目を設定
):
    # 1ページあたりのアイテム数を定義
    items_per_page = 5

    # ユーザーに関連する購入記録の総数を取得
    total_purchases = db.query(Purchase).filter(Purchase.user_id == user_id).count()

    # トータルページ数を計算
    total_page = (total_purchases + items_per_page - 1) // items_per_page  # 切り上げ計算

    # Purchaseをdate_timeの降順で取得し、ページング
    purchases = db.query(Purchase).filter(Purchase.user_id == user_id).order_by(Purchase.date_time.desc()).offset((page - 1) * items_per_page).limit(items_per_page).all()

    if not purchases:
        raise HTTPException(status_code=404, detail="Purchases not found")

    purchase_logs = []

    for purchase in purchases:
        purchase_details = (
            db.query(
                PurchaseDetail.ec_brand_id,
                PurchaseDetail.category,
                PurchaseDetail.name,
                PurchaseDetail.price,
                PurchaseDetail.ec_set_id,
                func.count(PurchaseDetail.ec_brand_id).label('count'),
            )
            .filter(PurchaseDetail.purchase_id == purchase.purchase_id)
            .group_by(
                PurchaseDetail.ec_brand_id,
                PurchaseDetail.category,
                PurchaseDetail.name,
                PurchaseDetail.price,
                PurchaseDetail.ec_set_id,
            )
            .all()
        )

        details = []

        for row in purchase_details:
            ec_brand = db.query(EC_Brand).filter(EC_Brand.ec_brand_id == row.ec_brand_id).first()
            picture = None
            if ec_brand:
                brand = db.query(Brand).filter(Brand.brand_id == ec_brand.brand_id).first()
                if brand and brand.brand_picture:
                    picture = base64.b64encode(brand.brand_picture).decode('utf-8')

            details.append(
                PurchaseItem(
                    ec_brand_id=row.ec_brand_id,
                    category=row.category,
                    name=row.name,
                    price=row.price,
                    count=row.count,
                    ec_set_id=row.ec_set_id,
                    picture=picture,
                )
            )

        log = Purchaselog(
            purchase_id=purchase.purchase_id,
            date_time=purchase.date_time,
            total_amount=purchase.total_amount,
            total_cans=purchase.total_cans,
            survey_completion=purchase.survey_completion,
            details=details,
        )

        purchase_logs.append(log)

    return PurchaselogPage(page=page, total_page=total_page, purchaselog=purchase_logs)
