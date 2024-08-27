from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import date, datetime


class UserBase(BaseModel):
    user_name: str
    user_profile: str
    user_picture: str


class UserCreate(UserBase):
    pass


class User(UserBase):
    user_id: int

    class Config:
        orm_mode = True


class Photo(BaseModel):
    photo_id: int
    photo_data: str

    class Config:
        orm_mode = True


class UserWithPhotos(BaseModel):
    user: User
    photos: List[Photo]


class ECSetItem(BaseModel):
    ec_set_id: int
    set_name: str
    set_description: str


class RecommendQueryParams(BaseModel):
    ec_set_id: int
    category: str
    cans: int
    kinds: int
    ng_id: List[int] = []


class RecommendResponseItem(BaseModel):
    ec_brand_id: int
    name: str
    description: str
    price: int
    count: int
    picture: Optional[str] = None


class Brand(BaseModel):
    brand_id: int
    brand_name: str
    brand_logo: Optional[str] = None

    class Config:
        orm_mode = True


class Item(BaseModel):
    item_id: int
    item_name: str

    class Config:
        orm_mode = True


class Preference(BaseModel):
    user_id: int
    item_id: int
    score: float
    item: Item

    class Config:
        orm_mode = True


class UserPreferences(BaseModel):
    preferences: List[Preference]

    class Config:
        orm_mode = True


class UpdatePreferencesRequest(BaseModel):
    user_id: int
    preferences: Dict[int, float]


class FavoriteCreate(BaseModel):
    user_id: int
    brand_name: str

    class Config:
        orm_mode = True


class UserFavorites(BaseModel):
    favorites: List[Brand]

    class Config:
        orm_mode = True


class Survey(BaseModel):
    taste: str
    packaging: str
    overall: str
    comments: Optional[str] = None


class SurveyResponse(BaseModel):
    item_id: int
    score: float


class SurveySubmission(BaseModel):
    purchase_id: int
    brand_id: int
    age: int
    gender: int
    purchase_date: str
    responses: List[SurveyResponse]


class UserWithAgeGender(BaseModel):
    user_name: str
    age: int
    gender: int


class PurchaseDate(BaseModel):
    purchase_date: date


# パスワード更新のためのリクエストモデル
class UpdatePasswordRequest(BaseModel):
    user_id: int
    new_password: str


class LoginRequest(BaseModel):
    user_mail: str
    user_password: str


class PurchaseItem(BaseModel):
    ec_brand_id: int
    category: str
    name: str
    price: int
    count: int
    ec_set_id: int
    picture: Optional[str] = None


class PurchaseSubSetItem(BaseModel):
    cans: int
    set_name: str
    details: List[PurchaseItem]


class SetDetails(BaseModel):
    cans: int
    set_num: int


class PurchaseSetItem(BaseModel):
    setDetails: SetDetails
    national_set: PurchaseSubSetItem
    craft_set: PurchaseSubSetItem


class TransactionResponse(BaseModel):
    total_amount: int


class ECSearchResult(BaseModel):
    ec_brand_id: int
    name: str
    category: str
    description: str
    price: int


class Purchaselog(BaseModel):
    purchase_id: int
    date_time: datetime
    total_amount: int
    total_cans: int
    survey_completion: bool
    details: List[PurchaseItem]


class UserNameResponse(BaseModel):
    user_name: str


# frontでは整数値が扱うので、返す値を丸めておく。
class BrandPreferences(BaseModel):
    preferences: Dict[int, int]


class PurchaselogPage(BaseModel):
    page: int
    total_page: int
    purchaselog: List[Purchaselog]
