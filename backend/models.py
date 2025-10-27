from sqlalchemy import Column, String, Float, Date, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Owner(Base):
    __tablename__ = "owners"
    owner_id = Column(String, primary_key=True)
    name = Column(String)
    address = Column(String)
    phone = Column(String)
    charger_id = Column(String)
    last_month_used = Column(Date)

class Consumption(Base):
    __tablename__ = "consumptions"
    id = Column(Integer, primary_key=True)
    charger_id = Column(String)
    period_start = Column(Date)
    period_end = Column(Date)
    kwh_used = Column(Float)
    cost_per_kwh = Column(Float)
    total_cost = Column(Float)
    fetched_at = Column(TIMESTAMP)

class Invoice(Base):
    __tablename__ = "invoices"
    invoice_id = Column(String, primary_key=True)
    owner_id = Column(String, ForeignKey("owners.owner_id"))
    period_start = Column(Date)
    period_end = Column(Date)
    total_amount = Column(Float)
    pdf_url = Column(String)
    generated_at = Column(TIMESTAMP)
