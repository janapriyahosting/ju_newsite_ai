"""
Seed script — run with:
  python -m backend.app.scripts.seed
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.dirname(__file__))))))

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit
from backend.app.models.coupon import Coupon
from datetime import datetime, timedelta
import uuid


async def seed():
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding database...")

        # Project 1
        p1 = Project(
            id=uuid.uuid4(),
            name="Janapriya Heights",
            slug="janapriya-heights",
            description="Premium 2 & 3 BHK apartments in the heart of Hyderabad",
            location="Kondapur, Hyderabad",
            address="Plot No 42, Kondapur Main Road",
            city="Hyderabad",
            state="Telangana",
            pincode="500084",
            lat=17.4700,
            lng=78.3500,
            rera_number="P02400001234",
            amenities=["Swimming Pool","Gym","Clubhouse","24/7 Security",
                       "Power Backup","Children Play Area","Landscaped Gardens"],
            images=["/media/projects/heights/main.jpg"],
            is_active=True,
            is_featured=True,
        )

        # Project 2
        p2 = Project(
            id=uuid.uuid4(),
            name="Janapriya Meadows",
            slug="janapriya-meadows",
            description="Luxury villas and plots at Shamshabad",
            location="Shamshabad, Hyderabad",
            address="Survey No 123, Shamshabad",
            city="Hyderabad",
            state="Telangana",
            pincode="501218",
            lat=17.2403,
            lng=78.4294,
            rera_number="P02400005678",
            amenities=["Club House","Jogging Track","Temple","Shopping Complex",
                       "Gated Community","Solar Power"],
            images=["/media/projects/meadows/main.jpg"],
            is_active=True,
            is_featured=False,
        )

        db.add_all([p1, p2])
        await db.flush()
        print(f"  ✅ Projects: {p1.name}, {p2.name}")

        # Tower A - Heights
        t1 = Tower(
            id=uuid.uuid4(),
            project_id=p1.id,
            name="Tower A",
            description="East facing tower with city views",
            total_floors=15,
            total_units=60,
            is_active=True,
        )
        # Tower B - Heights
        t2 = Tower(
            id=uuid.uuid4(),
            project_id=p1.id,
            name="Tower B",
            description="West facing tower with lake views",
            total_floors=15,
            total_units=60,
            is_active=True,
        )
        # Tower - Meadows
        t3 = Tower(
            id=uuid.uuid4(),
            project_id=p2.id,
            name="Phase 1",
            description="Villa plots — Phase 1",
            total_floors=2,
            total_units=40,
            is_active=True,
        )

        db.add_all([t1, t2, t3])
        await db.flush()
        print(f"  ✅ Towers: Tower A, Tower B, Phase 1")

        # Units — Tower A (2BHK and 3BHK)
        units = []
        unit_configs = [
            # (floor, number, type, beds, baths, area, price, dp, emi, facing, trending)
            (2,  "A-201", "2BHK", 2, 2, 1050, 5500000,  550000,  35000, "East",  True),
            (2,  "A-202", "3BHK", 3, 2, 1450, 7500000,  750000,  47000, "West",  False),
            (3,  "A-301", "2BHK", 2, 2, 1050, 5600000,  560000,  36000, "East",  True),
            (3,  "A-302", "3BHK", 3, 3, 1500, 7800000,  780000,  49000, "West",  False),
            (4,  "A-401", "2BHK", 2, 2, 1075, 5750000,  575000,  37000, "East",  False),
            (4,  "A-402", "3BHK", 3, 3, 1550, 8000000,  800000,  50000, "North", True),
            (5,  "A-501", "1BHK", 1, 1,  650, 3200000,  320000,  21000, "East",  False),
            (5,  "A-502", "2BHK", 2, 2, 1075, 5800000,  580000,  37500, "South", False),
            (6,  "A-601", "3BHK", 3, 3, 1600, 8500000,  850000,  53000, "East",  True),
            (6,  "A-602", "2BHK", 2, 2, 1100, 6000000,  600000,  38500, "West",  False),
            (10, "A-1001","3BHK", 3, 3, 1650, 9500000,  950000,  59000, "East",  True),
            (10, "A-1002","4BHK", 4, 4, 2200,13000000, 1300000,  81000, "North", False),
            (15, "A-1501","3BHK", 3, 3, 1700,11000000, 1100000,  68000, "East",  True),
            (15, "A-1502","4BHK", 4, 4, 2400,15000000, 1500000,  93000, "North", False),
        ]

        for floor, num, utype, beds, baths, area, price, dp, emi, facing, trending in unit_configs:
            units.append(Unit(
                id=uuid.uuid4(),
                tower_id=t1.id,
                unit_number=num,
                floor_number=floor,
                unit_type=utype,
                bedrooms=beds,
                bathrooms=baths,
                balconies=1,
                area_sqft=area,
                carpet_area=int(area * 0.75),
                base_price=price,
                price_per_sqft=int(price / area),
                down_payment=dp,
                emi_estimate=emi,
                facing=facing,
                status="available",
                amenities=["Modular Kitchen","Vitrified Tiles","UPVC Windows"],
                images=[],
                is_trending=trending,
                is_featured=trending,
                view_count=0,
            ))

        # Units — Tower B
        b_units = [
            (2,  "B-201", "2BHK", 2, 2, 1060, 5600000,  560000,  36000, "West",  False),
            (3,  "B-301", "3BHK", 3, 2, 1480, 7700000,  770000,  48000, "West",  True),
            (5,  "B-501", "2BHK", 2, 2, 1080, 5900000,  590000,  38000, "North", False),
            (8,  "B-801", "3BHK", 3, 3, 1580, 8800000,  880000,  55000, "West",  True),
            (12, "B-1201","4BHK", 4, 4, 2300,14000000, 1400000,  87000, "West",  False),
        ]
        for floor, num, utype, beds, baths, area, price, dp, emi, facing, trending in b_units:
            units.append(Unit(
                id=uuid.uuid4(),
                tower_id=t2.id,
                unit_number=num,
                floor_number=floor,
                unit_type=utype,
                bedrooms=beds,
                bathrooms=baths,
                balconies=1,
                area_sqft=area,
                carpet_area=int(area * 0.75),
                base_price=price,
                price_per_sqft=int(price / area),
                down_payment=dp,
                emi_estimate=emi,
                facing=facing,
                status="available",
                amenities=["Modular Kitchen","Vitrified Tiles"],
                images=[],
                is_trending=trending,
                is_featured=False,
                view_count=0,
            ))

        # Units — Meadows (Plots)
        for i in range(1, 11):
            units.append(Unit(
                id=uuid.uuid4(),
                tower_id=t3.id,
                unit_number=f"P-{i:03d}",
                floor_number=0,
                unit_type="plot",
                area_sqft=1200 + (i * 50),
                plot_area=1200 + (i * 50),
                base_price=3000000 + (i * 200000),
                price_per_sqft=2500,
                down_payment=300000 + (i * 20000),
                emi_estimate=20000 + (i * 1000),
                status="available",
                amenities=["Gated","24/7 Security","HMDA Approved"],
                images=[],
                is_trending=i <= 3,
                is_featured=False,
                view_count=0,
            ))

        db.add_all(units)
        await db.flush()
        print(f"  ✅ Units: {len(units)} units created")

        # Coupons
        c1 = Coupon(
            id=uuid.uuid4(),
            code="LAUNCH10",
            description="10% off on booking amount — launch offer",
            discount_type="percentage",
            discount_value=10,
            min_amount=100000,
            max_discount=100000,
            usage_limit=50,
            used_count=0,
            valid_from=datetime.utcnow(),
            valid_until=datetime.utcnow() + timedelta(days=90),
            is_active=True,
        )
        c2 = Coupon(
            id=uuid.uuid4(),
            code="FLAT25K",
            description="Flat ₹25,000 off on booking",
            discount_type="fixed",
            discount_value=25000,
            min_amount=500000,
            usage_limit=100,
            used_count=0,
            valid_from=datetime.utcnow(),
            valid_until=datetime.utcnow() + timedelta(days=60),
            is_active=True,
        )

        db.add_all([c1, c2])
        await db.flush()
        print(f"  ✅ Coupons: LAUNCH10, FLAT25K")

        await db.commit()
        print("")
        print("✅ Seed complete!")
        print(f"   Projects : 2")
        print(f"   Towers   : 3")
        print(f"   Units    : {len(units)}")
        print(f"   Coupons  : 2")


if __name__ == "__main__":
    asyncio.run(seed())
