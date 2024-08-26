# uname() error回避
import platform

print(platform.uname())
# 意図は理解しきれていないが入れておく

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# 環境変数のロード
load_dotenv()  # デプロイ時に残しておいても問題ないらしい（あやしければ無効にする）
AZURE_MY_SERVER = os.getenv("AZURE_MY_SERVER")
AZURE_MY_ADMIN = os.getenv("AZURE_MY_ADMIN")
AZURE_MY_PASSWORD = os.getenv("AZURE_MY_PASSWORD")
AZURE_MY_DATABASE = os.getenv("AZURE_MY_DATABASE")

# SSL証明書のパスを設定(connect.pyと同じ場所におく)
base_path = os.path.dirname(os.path.abspath(__file__))
ssl_cert_path = os.path.join(base_path, '../backend_env/DigiCertGlobalRootCA.crt.pem')

# SQLAlchemyの接続URLを作成
connection_url = f"mysql+pymysql://{AZURE_MY_ADMIN}:{AZURE_MY_PASSWORD}@{AZURE_MY_SERVER}.mysql.database.azure.com/{AZURE_MY_DATABASE}?charset=utf8"

# SQLAlchemyエンジンを作成
engine = create_engine(connection_url, connect_args={"ssl": {"ca": ssl_cert_path}}, echo=True)

# セッションの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# データベースセッションを取得するための関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 接続テスト
try:
    with engine.connect() as connection:
        print("Connection established")
except Exception as e:
    print(f"Connection failed: {e}")
