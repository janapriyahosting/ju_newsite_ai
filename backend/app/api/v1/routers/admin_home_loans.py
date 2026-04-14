from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.home_loan_request import HomeLoanRequest

router = APIRouter(prefix="/admin", tags=["admin"])


def _serialize(r: HomeLoanRequest) -> dict:
    return {
        "id": str(r.id),
        "name": r.name, "phone": r.phone, "email": r.email,
        "pan": r.pan, "aadhar": r.aadhar, "dob": r.dob,
        "address_line1": r.address_line1, "address_line2": r.address_line2,
        "city": r.city, "pincode": r.pincode, "state": r.state, "country": r.country,
        "employment_type": r.employment_type,
        "gross_monthly_income": float(r.gross_monthly_income) if r.gross_monthly_income else None,
        "current_obligations": float(r.current_obligations) if r.current_obligations else None,
        "organisation": r.organisation, "work_experience": r.work_experience,
        "payslips_url": r.payslips_url, "form16_url": r.form16_url,
        "has_co_applicant": r.has_co_applicant, "co_applicant": r.co_applicant,
        "loan_amount": float(r.loan_amount) if r.loan_amount else None,
        "property_value": float(r.property_value) if r.property_value else None,
        "unit_id": str(r.unit_id) if r.unit_id else None,
        "unit_number": r.unit_number, "tower_name": r.tower_name, "project_name": r.project_name,
        "customer_id": str(r.customer_id) if r.customer_id else None,
        "status": r.status, "notes": r.notes,
        "admin_remarks": r.admin_remarks, "assigned_to": r.assigned_to,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("/home-loan-requests")
async def list_home_loan_requests(
    page: int = 1, page_size: int = 20, status: str = "",
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token),
):
    q = select(HomeLoanRequest)
    if status:
        q = q.where(HomeLoanRequest.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(
        q.order_by(HomeLoanRequest.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [_serialize(r) for r in result.scalars().all()],
    }


@router.get("/home-loan-requests/{request_id}")
async def get_home_loan_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token),
):
    result = await db.execute(select(HomeLoanRequest).where(HomeLoanRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Home loan request not found")
    return _serialize(req)


@router.patch("/home-loan-requests/{request_id}")
async def update_home_loan_request(
    request_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token),
):
    result = await db.execute(select(HomeLoanRequest).where(HomeLoanRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Home loan request not found")
    for k, v in data.items():
        if k in ("status", "admin_remarks", "assigned_to"):
            setattr(req, k, v)
    await db.flush()
    return {"id": str(req.id), "status": req.status}


@router.delete("/home-loan-requests/{request_id}")
async def delete_home_loan_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token),
):
    result = await db.execute(select(HomeLoanRequest).where(HomeLoanRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Home loan request not found")
    await db.delete(req)
    await db.flush()
    return {"detail": "Deleted"}
