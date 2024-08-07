from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from db_control import crud, connect, schemas, recommend_func
from db_control.mymodels import Item, Brand, Preference, Favorite, SurveyRawData, User, PurchaseDetail, EC_Brand, Purchase
from db_control.token import router as token_router
import base64
from typing import List, Dict, Optional
from datetime import datetime, date

app = FastAPI()

app.include_router(token_router)  # ログイン関係

# CORS設定
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def calculate_age(birthdate: date) -> int:
    today = date.today()
    return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))


@app.get("/user/{user_id}", response_model=schemas.UserWithAgeGender)
def read_user(user_id: int, db: Session = Depends(connect.get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    age = calculate_age(user.birthdate)
    return {"age": age, "gender": user.gender}


@app.get("/user_with_photos", response_model=schemas.UserWithPhotos)
def read_user_with_photos(user_id: int, db: Session = Depends(connect.get_db)):
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.user_picture = base64.b64encode(user.user_picture).decode('utf-8') if user.user_picture else ""

    photos = crud.get_user_photos(db, user_id=user_id)
    for photo in photos:
        photo.photo_data = base64.b64encode(photo.photo_data).decode('utf-8')

    return {"user": user, "photos": photos}


@app.get("/user_preferences", response_model=List[schemas.Preference])
def read_user_preferences(user_id: int, db: Session = Depends(connect.get_db)):
    preferences = crud.get_user_preferences(db, user_id=user_id)
    if not preferences:
        raise HTTPException(status_code=404, detail="Preferences not found")
    for preference in preferences:
        item = db.query(Item).filter(Item.item_id == preference.item_id).first()
        preference.item = item
    return preferences


@app.post("/add_favorite", response_model=schemas.Brand)
def add_favorite(favorite: schemas.FavoriteCreate, db: Session = Depends(connect.get_db)):
    brand = db.query(Brand).filter(Brand.brand_name == favorite.brand_name).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    new_favorite = Favorite(user_id=favorite.user_id, brand_id=brand.brand_id)
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    return brand


@app.post("/update_preferences")
def update_preferences(request: schemas.UpdatePreferencesRequest, db: Session = Depends(connect.get_db)):
    for item_id, score in request.preferences.items():
        crud.update_user_preference(db, user_id=request.user_id, item_id=item_id, score=score)
    return {"message": "Preferences updated successfully"}


@app.get("/search_brands", response_model=List[schemas.Brand])
def search_brands(search_term: str, db: Session = Depends(connect.get_db)):
    brands = crud.search_brands(db, search_term=search_term)
    if not brands:
        raise HTTPException(status_code=404, detail="Brands not found")
    return brands


@app.get("/user_favorites", response_model=List[schemas.Brand])
def read_user_favorites(user_id: int = Query(...), db: Session = Depends(connect.get_db)):
    favorites = crud.get_user_favorites(db, user_id=user_id)
    if not favorites:
        raise HTTPException(status_code=404, detail="Favorites not found")
    return favorites


@app.delete("/delete_favorite")
def delete_favorite(user_id: int = Query(...), brand_id: int = Query(...), db: Session = Depends(connect.get_db)):
    favorite = db.query(Favorite).filter(Favorite.user_id == user_id, Favorite.brand_id == brand_id).first()
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(favorite)
    db.commit()
    return {"message": "Favorite deleted successfully"}


# New Endpoint to get brand information by purchase_id
@app.get("/purchase/{purchase_id}/brands", response_model=List[schemas.Brand])
def get_brands_by_purchase_id(purchase_id: int, db: Session = Depends(connect.get_db)):
    purchase_details = db.query(PurchaseDetail).filter(PurchaseDetail.purchase_id == purchase_id).all()
    if not purchase_details:
        raise HTTPException(status_code=404, detail="Purchase details not found")

    brand_ids = set()
    for detail in purchase_details:
        ec_brand = db.query(EC_Brand).filter(EC_Brand.ec_brand_id == detail.ec_brand_id).first()
        if ec_brand:
            brand_ids.add(ec_brand.brand_id)

    brands = db.query(Brand).filter(Brand.brand_id.in_(brand_ids)).all()
    if not brands:
        raise HTTPException(status_code=404, detail="Brands not found")

    return brands


# New Endpoint to get purchase date by purchase_id
@app.get("/purchase/{purchase_id}/date", response_model=schemas.PurchaseDate)
def get_purchase_date(purchase_id: int, db: Session = Depends(connect.get_db)):
    purchase = db.query(Purchase).filter(Purchase.purchase_id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {"purchase_date": purchase.date_time.date()}


# New Survey Endpoint
@app.post("/survey/{purchase_id}")
async def submit_survey(purchase_id: int, survey: schemas.SurveySubmission, db: Session = Depends(connect.get_db)):
    try:
        # 現在の最大raw_data_idを取得
        max_raw_data_id = db.query(SurveyRawData.raw_data_id).order_by(SurveyRawData.raw_data_id.desc()).first()
        if max_raw_data_id is None:
            max_raw_data_id = 0
        else:
            max_raw_data_id = max_raw_data_id[0]

        # 新しいraw_data_idを生成
        new_raw_data_id = max_raw_data_id + 1

        # アンケート回答をDBに格納
        for response in survey.responses:
            survey_raw_data = SurveyRawData(
                raw_data_id=new_raw_data_id,  # 生成したraw_data_idを使用
                item_id=response.item_id,
                brand_id=survey.brand_id,
                score=response.score,
                age=survey.age,
                gender=survey.gender,
                purchase_date=datetime.strptime(survey.purchase_date, '%Y-%m-%d').date(),
            )
            db.add(survey_raw_data)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving survey data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving survey data: {str(e)}")
    return {"message": "Survey submitted successfully"}


# New Endpoint to get item information
@app.get("/items", response_model=List[schemas.Item])
async def get_items(db: Session = Depends(connect.get_db)):
    items = db.query(Item).all()
    if not items:
        raise HTTPException(status_code=404, detail="Items not found")
    return items

# New Endpoint to get average scores for a brand
@app.get("/brand/{brand_id}/average_scores", response_model=Dict[int, float])
async def get_brand_average_scores(brand_id: int, db: Session = Depends(connect.get_db)):
    average_scores = db.query(SurveyRawData.item_id, func.avg(SurveyRawData.score).label('average_score')) \
                    .filter(SurveyRawData.brand_id == brand_id) \
                    .group_by(SurveyRawData.item_id) \
                    .all()
    return {item_id: avg_score for item_id, avg_score in average_scores}

@app.get("/brands/{brand_id}/logo")
def get_brand_logo(brand_id: int, db: Session = Depends(connect.get_db)):
    brand = db.query(Brand).filter(Brand.brand_id == brand_id).first()
    if not brand or not brand.brand_picture:
        raise HTTPException(status_code=404, detail="Brand logo not found")
    return Response(content=brand.brand_picture, media_type="image/png")

@app.post("/purchase/{purchase_id}/complete")
def complete_survey(purchase_id: int, db: Session = Depends(connect.get_db)):
    try:
        db.query(Purchase).filter(Purchase.purchase_id == purchase_id).update({Purchase.survey_completion: 1})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error completing survey: {str(e)}")
    return {"message": "Survey completed"}

@app.get("/ec_sets", response_model=List[schemas.ECSetItem])
def get_ec_sets(category: str, db: Session = Depends(connect.get_db)):
    ec_sets = recommend_func.get_ec_sets_by_category(db, category)

    return ec_sets


@app.get("/recommend", response_model=List[schemas.RecommendResponseItem])
def recommend(
    ec_set_id: int = Query(...),
    category: str = Query(...),
    cans: int = Query(...),
    kinds: int = Query(...),
    ng_id: List[int] = Query([]),  # Pydanticのモデルではリストをうまく受け取れなったのでQueryを使う
    db: Session = Depends(connect.get_db),
):
    # 検証用にPydanticのモデルへ入れておく
    params = schemas.RecommendQueryParams(ec_set_id=ec_set_id, category=category, cans=cans, kinds=kinds, ng_id=ng_id)

    # 改めてパラメータを置き直す
    ec_set_id = params.ec_set_id
    category = params.category
    cans = params.cans
    kinds = params.kinds
    ng_id = params.ng_id

    # 最終的にはJWTから取得する
    user_id = 1

    if ec_set_id == 2:

        # ec_set_idとアルゴリズムの対応を、一旦、直に書いておく
        # マッピングはうまく行かない
        # 関数のマッピング
        # function_mapping = {
        #     # "recommend_popular_products": recommend_popular_products,  # 未実装
        #     "recommend_preferred_products": recommend.recommend_preferred_products,
        #     # "recommend_diverse_preferred_products": recommend_diverse_preferred_products,  # 未実装
        # }

        # algorithm_function = function_mapping.get("recommend_preferred_products")
        # response_data = algorithm_function(user_id, category, cans, kinds, ng_id, db)

        response_data = recommend_func.recommend_preferred_products(user_id, category, cans, kinds, ng_id, db)

    else:

        # ロジックをここに追加
        # 例: 推奨事項の計算やデータベースクエリ

        # クエリパラメータを使用してロジックを実装
        # ここではダミーデータを返す

        if category == "national":
            response_data = [
                {"ec_brand_id": 1, "name": "Brand A", "description": "Description A", "price": 100, "count": params.cans / 2},
                {"ec_brand_id": 2, "name": "Brand B", "description": "Description B", "price": 200, "count": params.cans / 2},
            ]

        elif category == "craft":
            response_data = [
                {"ec_brand_id": 3, "name": "Brand C", "description": "Description C", "price": 100, "count": params.cans / 3},
                {"ec_brand_id": 4, "name": "Brand D", "description": "Description D", "price": 200, "count": params.cans / 3},
                {"ec_brand_id": 5, "name": "Brand E", "description": "Description E", "price": 200, "count": params.cans / 3},
            ]

    return response_data
