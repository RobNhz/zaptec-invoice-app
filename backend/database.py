from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables from .env file
# Try backend directory first, then project root
project_root = os.path.dirname(os.path.abspath(__file__))
for env_path in [os.path.join(project_root, '.env'), '/.env']:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zaptec.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
metadata = MetaData()