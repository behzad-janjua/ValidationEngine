import os
import csv
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
import openpyxl
from .llm_service import analyze_ideas

app = FastAPI()
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def read_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.csv':
        with open(file_path, newline='', encoding='utf-8') as f:
            return list(csv.DictReader(f))
    wb = openpyxl.load_workbook(file_path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h) for h in rows[0]]
    return [dict(zip(headers, row)) for row in rows[1:]]

@app.post('/upload-ideas')
async def upload_ideas(excel: UploadFile = File(...)):
    path = os.path.join(UPLOAD_FOLDER, excel.filename)
    with open(path, 'wb') as f:
        f.write(await excel.read())
    ideas = read_file(path)
    os.remove(path)
    return {"message": "Ideas extracted successfully", "count": len(ideas), "ideas": ideas}


@app.post('/analyze')
async def analyze(excel: UploadFile = File(...)):
    path = os.path.join(UPLOAD_FOLDER, excel.filename)
    with open(path, 'wb') as f:
        f.write(await excel.read())
    ideas = read_file(path)
    os.remove(path)
    analysis = analyze_ideas(ideas)
    return {"totalIdeas": len(ideas), "criteria": ['feasibility', 'innovation', 'impact', 'marketability', 'clarity'], "analysis": analysis}


@app.post('/analyze-local')
def analyze_local():
    file_path = os.path.join(UPLOAD_FOLDER, 'ideas.csv')
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail='uploads/ideas.csv not found')
    ideas = read_file(file_path)
    analysis = analyze_ideas(ideas)
    return {"totalIdeas": len(ideas), "criteria": ['feasibility', 'innovation', 'impact', 'marketability', 'clarity'], "analysis": analysis}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 3000)))