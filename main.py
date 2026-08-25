from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse # <- ¡Importación agregada!
from supabase import create_client, Client
import os

app = FastAPI()

# Permitir que tu frontend se comunique con esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- TUS CREDENCIALES EXACTAS DE SUPABASE ---
SUPABASE_URL = "https://jckfhmarxqnxrejnojtl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja2ZobWFyeHFueHJlam5vanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2Mjk5NTQsImV4cCI6MjEwMzIwNTk1NH0.vB9Num6WthGPj6lAMcr25f-I-UU8FSn2krxQuywVQhM"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- RUTA PRINCIPAL (CARGA LA INTERFAZ) ---
@app.get("/")
def leer_interfaz():
    # Asegúrate de que tu archivo se llame "index.html" en minúsculas en tu carpeta
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

# ==========================================
# RUTAS PARA GASTOS (CARD)
# ==========================================
@app.get("/api/gastos")
def obtener_gastos():
    res = supabase.table("card").select("*").execute()
    return res.data

@app.post("/api/gastos")
async def guardar_gasto(
    id: str = Form(""),
    monto: float = Form(...),
    desc: str = Form(...),
    tipo: str = Form(...),
    gasto: str = Form(...),
    fecha: str = Form(...),
    evidenciaFile: UploadFile = File(None)
):
    ruta_evidencia = ""
    
    # Si hay foto, la subimos a Supabase Storage
    if evidenciaFile and evidenciaFile.filename:
        file_bytes = await evidenciaFile.read()
        file_name = f"{id}_{evidenciaFile.filename}"
        supabase.storage.from_("evidencias").upload(file_name, file_bytes)
        ruta_evidencia = supabase.storage.from_("evidencias").get_public_url(file_name)

    data = {
        "monto": monto, 
        "descripcion": desc, 
        "tipo": tipo, 
        "gasto": gasto, 
        "fecha": fecha
    }
    
    # Solo actualizamos la foto si realmente se subió una nueva
    if ruta_evidencia:
        data["evidencia"] = ruta_evidencia

    if id and not id.startswith("temp-"):
        # MODO EDICIÓN
        supabase.table("card").update(data).eq("id", id).execute()
    else:
        # MODO NUEVO
        supabase.table("card").insert(data).execute()
        
    return {"status": "success"}

# ==========================================
# RUTAS PARA TAREAS (TASK)
# ==========================================
@app.get("/api/tareas")
def obtener_tareas():
    res = supabase.table("task").select("*").execute()
    return res.data

@app.post("/api/tareas")
async def guardar_tarea(
    id: str = Form(""),
    fecha: str = Form(...),
    titulo: str = Form(...),
    responsable: str = Form(...),
    prioridad: str = Form(...)
):
    data = {
        "fecha": fecha,
        "titulo": titulo,
        "responsable": responsable,
        "prioridad": prioridad
    }

    if id and not id.startswith("temp-"):
        # MODO EDICIÓN
        supabase.table("task").update(data).eq("id", id).execute()
    else:
        # MODO NUEVO
        data["estado"] = "To do"
        supabase.table("task").insert(data).execute()
        
    return {"status": "success"}

@app.post("/api/tareas/estado")
async def actualizar_estado_tarea(
    id: str = Form(...),
    estado: str = Form(...)
):
    # Esta ruta sirve para cuando le das clic al circulito de la tarea
    supabase.table("task").update({"estado": estado}).eq("id", id).execute()
    return {"status": "success"}