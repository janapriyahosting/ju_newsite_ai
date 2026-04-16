"""
Admin NLP Training — manage spaCy training data and trigger model training.
"""
import json, os, random
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, delete
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.search_log import SearchLog

router = APIRouter(prefix="/admin/nlp", tags=["Admin - NLP Training"])

MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../../../models/spacy_ner")
TRAINING_DATA_FILE = os.path.join(os.path.dirname(__file__), "../../../../models/training_data.json")

# Ensure dirs exist
os.makedirs(os.path.dirname(TRAINING_DATA_FILE), exist_ok=True)

# Entity labels for real estate NER — grouped by category
ENTITY_LABELS = [
    # Core search
    "BHK_TYPE", "PRICE", "FACING", "FLOOR", "AREA", "LOCATION", "STATUS", "EMI",
    # Property details
    "UNIT_NUMBER", "BEDROOMS", "BATHROOMS", "BALCONIES", "UNIT_TYPE",
    # Pricing breakdown
    "DOWN_PAYMENT", "BUDGET", "BASIC_COST", "GST", "TOTAL_COST", "LOAN_AMOUNT",
    "BOOKING_AMOUNT", "TOKEN_AMOUNT",
    # Area variants
    "CARPET_AREA", "PLOT_AREA", "BALCONY_AREA", "SALABLE_AREA",
    # Charges
    "MAINTENANCE", "PARKING", "DOCUMENTATION", "UTILITIES", "CLUB_HOUSE",
    # Project/Tower
    "PROJECT", "TOWER", "TYPOLOGY", "CONSTRUCTION_STAGE",
    # Amenities/Features
    "AMENITY", "LIFTS", "CORRIDOR", "OPEN_SPACE",
    # Availability
    "AVAILABILITY", "TRENDING", "FEATURED",
]


# ── Schemas ──────────────────────────────────────────────────────────────────
class TrainingExample(BaseModel):
    text: str
    entities: list  # [[start, end, label], ...]

class AddTrainingData(BaseModel):
    examples: List[TrainingExample]

class AutoGenerateRequest(BaseModel):
    count: int = 50


# ── Training data CRUD ───────────────────────────────────────────────────────
def _load_training_data() -> list:
    if os.path.exists(TRAINING_DATA_FILE):
        with open(TRAINING_DATA_FILE, "r") as f:
            return json.load(f)
    return []

def _save_training_data(data: list):
    with open(TRAINING_DATA_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("/training-data")
async def get_training_data(_: dict = Depends(verify_admin_token)):
    data = _load_training_data()
    return {"total": len(data), "examples": data}


@router.post("/training-data")
async def add_training_data(body: AddTrainingData, _: dict = Depends(verify_admin_token)):
    data = _load_training_data()
    for ex in body.examples:
        data.append({"text": ex.text, "entities": ex.entities})
    _save_training_data(data)
    return {"total": len(data), "added": len(body.examples)}


@router.delete("/training-data/{index}")
async def delete_training_example(index: int, _: dict = Depends(verify_admin_token)):
    data = _load_training_data()
    if index < 0 or index >= len(data):
        raise HTTPException(404, "Index out of range")
    removed = data.pop(index)
    _save_training_data(data)
    return {"removed": removed, "total": len(data)}


@router.delete("/training-data")
async def clear_training_data(_: dict = Depends(verify_admin_token)):
    _save_training_data([])
    return {"cleared": True}


# ── Auto-generate from search logs ──────────────────────────────────────────
@router.post("/auto-generate")
async def auto_generate_from_logs(
    body: AutoGenerateRequest,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Auto-label training data from past search logs using regex patterns."""
    import re

    result = await db.execute(
        select(SearchLog.query, SearchLog.filters)
        .where(SearchLog.query.isnot(None), SearchLog.results_count > 0)
        .order_by(func.random())
        .limit(body.count)
    )
    logs = result.all()

    generated = []

    for q_text, filters in logs:
        if not q_text or not q_text.strip():
            continue
        q = q_text.strip()
        entities = []

        # BHK / Unit type
        for m in re.finditer(r'\d(?:\.\d)?\s*bhk', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "BHK_TYPE"])
        for m in re.finditer(r'\b(?:villa|plot|penthouse|duplex|studio|apartment)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "UNIT_TYPE"])

        # Price patterns: "90l", "1.5cr", "80 lakhs", "₹90L"
        for m in re.finditer(r'(?:₹\s*)?\d+(?:\.\d+)?\s*(?:lakh|lakhs|lac|l\b|crore|crores|cr\b)', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "PRICE"])

        # Budget keywords
        for m in re.finditer(r'\bbudget\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "BUDGET"])

        # Down payment
        for m in re.finditer(r'\b(?:down\s*payment|downpayment)\s*(?:(?:₹|rs\.?\s*)?\d+(?:\.\d+)?\s*(?:lakh|lakhs|lac|l\b|crore|crores|cr\b)?)?', q, re.IGNORECASE):
            if m.end() - m.start() > 4:
                entities.append([m.start(), m.end(), "DOWN_PAYMENT"])

        # EMI
        for m in re.finditer(r'emi\s*(?:under|below|upto)?\s*(?:rs\.?\s*|₹\s*)?\d+(?:,\d+)?(?:\s*k)?', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "EMI"])

        # Booking / token amount
        for m in re.finditer(r'\b(?:booking|token)\s*(?:amount)?\s*(?:(?:₹|rs\.?\s*)?\d+(?:\.\d+)?\s*(?:lakh|lakhs|lac|l\b|k\b)?)?', q, re.IGNORECASE):
            if m.end() - m.start() > 5:
                entities.append([m.start(), m.end(), "BOOKING_AMOUNT"])

        # Facing
        for m in re.finditer(r'\b(?:east|west|north|south)(?:\s*facing)?\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "FACING"])

        # Floor
        for m in re.finditer(r'(?:floor\s*\d+|\d+(?:st|nd|rd|th)?\s*floor|high(?:er)?\s*floor|ground\s*floor|low(?:er)?\s*floor|top\s*floor)', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "FLOOR"])

        # Area variants
        for m in re.finditer(r'\d+\s*(?:sqft|sq\.?\s*ft|sft)', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "AREA"])
        for m in re.finditer(r'\bcarpet\s*area\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "CARPET_AREA"])
        for m in re.finditer(r'\bplot\s*area\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "PLOT_AREA"])

        # Bedrooms / Bathrooms / Balconies
        for m in re.finditer(r'\d+\s*(?:bed(?:room)?s?)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "BEDROOMS"])
        for m in re.finditer(r'\d+\s*(?:bath(?:room)?s?)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "BATHROOMS"])
        for m in re.finditer(r'\d+\s*(?:balcon(?:y|ies))\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "BALCONIES"])

        # Project / Tower / Location
        for m in re.finditer(r'\b(?:nilevalley|janapriya|block[- ]?\d+)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "PROJECT"])
        for m in re.finditer(r'\b(?:tower|block)\s*[a-z0-9-]+\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "TOWER"])
        for m in re.finditer(r'\b(?:madinaguda|hyderabad|miyapur|kukatpally|gachibowli|kondapur|madhapur)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "LOCATION"])

        # Status
        for m in re.finditer(r'\b(?:available|booked|sold|reserved|mortgage|ready\s*to\s*move)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "STATUS"])

        # Availability / Trending
        for m in re.finditer(r'\btrending\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "TRENDING"])

        # Amenities
        for m in re.finditer(r'\b(?:parking|car\s*parking|scooter\s*parking)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "PARKING"])
        for m in re.finditer(r'\b(?:lift|elevator)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "LIFTS"])
        for m in re.finditer(r'\b(?:club\s*house|swimming\s*pool|gym|garden)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "CLUB_HOUSE"])

        # Charges
        for m in re.finditer(r'\b(?:maintenance|advance\s*maintenance)\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "MAINTENANCE"])
        for m in re.finditer(r'\bgst\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "GST"])
        for m in re.finditer(r'\b(?:documentation|registration)\s*(?:charges|cost)?\b', q, re.IGNORECASE):
            entities.append([m.start(), m.end(), "DOCUMENTATION"])

        if entities:
            # Sort and remove overlaps
            entities.sort(key=lambda e: e[0])
            clean = []
            for ent in entities:
                if not clean or ent[0] >= clean[-1][1]:
                    clean.append(ent)
            generated.append({"text": q, "entities": clean})

    # Merge with existing
    existing = _load_training_data()
    existing_texts = {e["text"] for e in existing}
    new_count = 0
    for g in generated:
        if g["text"] not in existing_texts:
            existing.append(g)
            existing_texts.add(g["text"])
            new_count += 1
    _save_training_data(existing)

    return {"generated": len(generated), "new_added": new_count, "total": len(existing)}


# ── Seed examples ────────────────────────────────────────────────────────────
SEED_EXAMPLES = [
    # Core search
    {"text": "looking for 3 bhk in 90l budget", "entities": [[12, 17, "BHK_TYPE"], [21, 24, "PRICE"], [25, 31, "BUDGET"]]},
    {"text": "2bhk east facing under 70 lakhs", "entities": [[0, 4, "BHK_TYPE"], [5, 9, "FACING"], [22, 31, "PRICE"]]},
    {"text": "3bhk above 1.5cr", "entities": [[0, 4, "BHK_TYPE"], [11, 16, "PRICE"]]},
    {"text": "budget 80l 2 bhk", "entities": [[0, 6, "BUDGET"], [7, 10, "PRICE"], [11, 16, "BHK_TYPE"]]},
    {"text": "villa with 2000 sqft", "entities": [[0, 5, "UNIT_TYPE"], [11, 20, "AREA"]]},
    {"text": "3 bhk west facing high floor", "entities": [[0, 5, "BHK_TYPE"], [6, 10, "FACING"], [18, 28, "FLOOR"]]},
    {"text": "2 bhk under 65 lakhs ground floor", "entities": [[0, 5, "BHK_TYPE"], [12, 22, "PRICE"], [23, 35, "FLOOR"]]},
    {"text": "3bhk 1cr to 1.2cr", "entities": [[0, 4, "BHK_TYPE"], [5, 8, "PRICE"], [12, 17, "PRICE"]]},
    {"text": "emi under 50000 for 2bhk", "entities": [[0, 14, "EMI"], [19, 24, "BHK_TYPE"]]},
    {"text": "north facing 3 bhk above 90 lakhs", "entities": [[0, 5, "FACING"], [13, 18, "BHK_TYPE"], [25, 34, "PRICE"]]},
    {"text": "2.5 bhk east facing 1000 sqft", "entities": [[0, 7, "BHK_TYPE"], [8, 12, "FACING"], [20, 29, "AREA"]]},
    {"text": "1bhk below 50 lakhs low floor", "entities": [[0, 4, "BHK_TYPE"], [11, 21, "PRICE"], [22, 31, "FLOOR"]]},
    # Down payment / Loan / Booking
    {"text": "3bhk with down payment under 10 lakhs", "entities": [[0, 4, "BHK_TYPE"], [10, 22, "DOWN_PAYMENT"], [29, 38, "PRICE"]]},
    {"text": "booking amount 20000 for 2bhk", "entities": [[0, 14, "BOOKING_AMOUNT"], [20, 25, "PRICE"], [30, 34, "BHK_TYPE"]]},
    {"text": "loan amount below 80 lakhs", "entities": [[0, 11, "LOAN_AMOUNT"], [18, 27, "PRICE"]]},
    # Bathrooms / Balconies
    {"text": "3bhk 3 bathrooms with 2 balconies", "entities": [[0, 4, "BHK_TYPE"], [5, 17, "BATHROOMS"], [23, 35, "BALCONIES"]]},
    {"text": "2bhk 2 bathrooms east facing", "entities": [[0, 4, "BHK_TYPE"], [5, 17, "BATHROOMS"], [18, 22, "FACING"]]},
    # Area types
    {"text": "carpet area above 700 sqft 2bhk", "entities": [[0, 11, "CARPET_AREA"], [18, 26, "AREA"], [27, 31, "BHK_TYPE"]]},
    {"text": "plot area 1500 sqft", "entities": [[0, 9, "PLOT_AREA"], [10, 19, "AREA"]]},
    # Project / Tower / Location
    {"text": "nilevalley block-6 3bhk", "entities": [[0, 10, "PROJECT"], [11, 18, "TOWER"], [19, 23, "BHK_TYPE"]]},
    {"text": "3bhk in madinaguda", "entities": [[0, 4, "BHK_TYPE"], [8, 18, "LOCATION"]]},
    {"text": "units in tower block 6", "entities": [[15, 22, "TOWER"]]},
    # Status
    {"text": "available 3bhk east facing", "entities": [[0, 9, "STATUS"], [10, 14, "BHK_TYPE"], [15, 19, "FACING"]]},
    {"text": "ready to move 2bhk under 70l", "entities": [[0, 13, "STATUS"], [14, 18, "BHK_TYPE"], [25, 28, "PRICE"]]},
    # Charges / GST
    {"text": "3bhk with low maintenance cost", "entities": [[0, 4, "BHK_TYPE"], [14, 25, "MAINTENANCE"]]},
    {"text": "gst included units 2bhk", "entities": [[0, 3, "GST"], [18, 22, "BHK_TYPE"]]},
    {"text": "3bhk with car parking", "entities": [[0, 4, "BHK_TYPE"], [10, 21, "PARKING"]]},
    # Amenities
    {"text": "3bhk with club house and lift", "entities": [[0, 4, "BHK_TYPE"], [10, 20, "CLUB_HOUSE"], [25, 29, "LIFTS"]]},
    # Trending
    {"text": "trending 3bhk properties", "entities": [[0, 8, "TRENDING"], [9, 13, "BHK_TYPE"]]},
    # Complex queries
    {"text": "3bhk east facing 1500 sqft budget 1cr high floor", "entities": [[0, 4, "BHK_TYPE"], [5, 9, "FACING"], [17, 26, "AREA"], [27, 33, "BUDGET"], [34, 37, "PRICE"], [38, 48, "FLOOR"]]},
]

@router.post("/seed")
async def seed_training_data(_: dict = Depends(verify_admin_token)):
    existing = _load_training_data()
    existing_texts = {e["text"] for e in existing}
    added = 0
    for ex in SEED_EXAMPLES:
        if ex["text"] not in existing_texts:
            existing.append(ex)
            existing_texts.add(ex["text"])
            added += 1
    _save_training_data(existing)
    return {"seeded": added, "total": len(existing)}


# ── Train model ──────────────────────────────────────────────────────────────
_training_status = {"status": "idle", "message": "", "progress": 0}

@router.get("/training-status")
async def get_training_status(_: dict = Depends(verify_admin_token)):
    return _training_status


def _run_training():
    """Background task: train spaCy NER model."""
    global _training_status
    try:
        import spacy
        from spacy.training import Example
        from spacy.util import minibatch, compounding

        _training_status = {"status": "training", "message": "Loading training data...", "progress": 5}

        data = _load_training_data()
        if len(data) < 5:
            _training_status = {"status": "error", "message": "Need at least 5 training examples", "progress": 0}
            return

        # Convert to spaCy format
        train_data = []
        for item in data:
            ents = [(e[0], e[1], e[2]) for e in item["entities"]]
            train_data.append((item["text"], {"entities": ents}))

        _training_status = {"status": "training", "message": "Initializing model...", "progress": 10}

        # Create blank or load existing
        nlp = spacy.blank("en")
        if "ner" not in nlp.pipe_names:
            ner = nlp.add_pipe("ner", last=True)
        else:
            ner = nlp.get_pipe("ner")

        for label in ENTITY_LABELS:
            ner.add_label(label)

        # Train
        n_iter = 30
        optimizer = nlp.begin_training()

        for epoch in range(n_iter):
            random.shuffle(train_data)
            losses = {}
            batches = minibatch(train_data, size=compounding(4.0, 32.0, 1.001))
            for batch in batches:
                examples = []
                for text, annotations in batch:
                    doc = nlp.make_doc(text)
                    try:
                        example = Example.from_dict(doc, annotations)
                        examples.append(example)
                    except Exception:
                        continue
                if examples:
                    nlp.update(examples, sgd=optimizer, losses=losses)

            progress = 10 + int((epoch + 1) / n_iter * 85)
            _training_status = {
                "status": "training",
                "message": f"Epoch {epoch+1}/{n_iter} — Loss: {losses.get('ner', 0):.4f}",
                "progress": progress,
            }

        # Save model
        os.makedirs(MODEL_DIR, exist_ok=True)
        nlp.to_disk(MODEL_DIR)

        _training_status = {
            "status": "complete",
            "message": f"Model trained on {len(train_data)} examples ({n_iter} epochs). Saved to {MODEL_DIR}",
            "progress": 100,
        }

    except Exception as e:
        _training_status = {"status": "error", "message": str(e), "progress": 0}


@router.post("/train")
async def train_model(bg: BackgroundTasks, _: dict = Depends(verify_admin_token)):
    global _training_status
    if _training_status.get("status") == "training":
        raise HTTPException(409, "Training already in progress")
    _training_status = {"status": "starting", "message": "Queued for training...", "progress": 0}
    bg.add_task(_run_training)
    return {"message": "Training started in background"}


# ── Model info ───────────────────────────────────────────────────────────────
@router.get("/model-info")
async def get_model_info(_: dict = Depends(verify_admin_token)):
    model_exists = os.path.exists(os.path.join(MODEL_DIR, "meta.json"))
    info = {"trained": model_exists, "path": MODEL_DIR}
    if model_exists:
        import datetime
        mtime = os.path.getmtime(os.path.join(MODEL_DIR, "meta.json"))
        info["last_trained"] = datetime.datetime.fromtimestamp(mtime).isoformat()
        with open(os.path.join(MODEL_DIR, "meta.json")) as f:
            meta = json.load(f)
        info["pipeline"] = meta.get("pipeline", [])
        info["labels"] = meta.get("labels", {})
    return info


# ── Test model ───────────────────────────────────────────────────────────────
class TestQuery(BaseModel):
    text: str

@router.post("/test")
async def test_model(body: TestQuery, _: dict = Depends(verify_admin_token)):
    results = {"query": body.text, "custom_model": None, "spacy_default": None}

    # Test custom model
    if os.path.exists(os.path.join(MODEL_DIR, "meta.json")):
        import spacy
        nlp = spacy.load(MODEL_DIR)
        doc = nlp(body.text)
        results["custom_model"] = [
            {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
            for ent in doc.ents
        ]

    # Test default spaCy
    try:
        import spacy
        nlp2 = spacy.load("en_core_web_sm")
        doc2 = nlp2(body.text)
        results["spacy_default"] = [
            {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
            for ent in doc2.ents
        ]
    except:
        pass

    return results


# ── Search logs for review ───────────────────────────────────────────────────
@router.get("/search-logs")
async def get_search_logs(
    page: int = 1, page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    total = (await db.execute(select(func.count()).select_from(SearchLog))).scalar()
    result = await db.execute(
        select(SearchLog)
        .order_by(SearchLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    logs = result.scalars().all()
    items = []
    parser_stats = {"groq": 0, "spacy": 0, "regex": 0, "unknown": 0}
    for l in logs:
        filters = l.filters or {}
        parser = filters.get("_parser", "unknown")
        parser_stats[parser] = parser_stats.get(parser, 0) + 1
        items.append({
            "id": str(l.id),
            "query": l.query,
            "filters": {k: v for k, v in filters.items() if k != "_parser"},
            "parser": parser,
            "results_count": l.results_count,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        })

    # Get overall stats from all logs
    all_logs = await db.execute(select(SearchLog.filters))
    all_stats = {"groq": 0, "spacy": 0, "regex": 0, "unknown": 0}
    for row in all_logs.scalars():
        p = (row or {}).get("_parser", "unknown")
        all_stats[p] = all_stats.get(p, 0) + 1

    return {
        "total": total,
        "page": page,
        "parser_stats": all_stats,
        "items": items,
    }
