from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
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
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impja2ZobWFyeHFueHJlam5vanRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzYyOTk1NCwiZXhwIjoyMTAzMjA1OTU0fQ.2L6P9jwRooG0LfUkMfpRL0hY9AZm7sDdQXSuwWANAHQ"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CONFIGURACIÓN DE MÓDULOS (CARPETAS) ---
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- RUTA PRINCIPAL (CARGA LA INTERFAZ) ---
@app.get("/", response_class=HTMLResponse)
async def leer_interfaz(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")
    
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
    
    # EL SALVAVIDAS: Intentamos subir la foto
    if evidenciaFile and evidenciaFile.filename:
        try:
            file_bytes = await evidenciaFile.read()
            file_name = f"{id}_{evidenciaFile.filename}"
            supabase.storage.from_("evidencias").upload(
                file_name, 
                file_bytes,
                {"content-type": evidenciaFile.content_type}
            )
            ruta_evidencia = supabase.storage.from_("evidencias").get_public_url(file_name)
        except Exception as e:
            print(f"Error al subir foto: {e}")
            # Si la foto falla, el código continúa
    
    data = {
        "monto": monto, 
        "descripcion": desc, 
        "tipo": tipo, 
        "gasto": gasto, 
        "fecha": fecha
    }
    
    if ruta_evidencia:
        data["evidencia"] = ruta_evidencia

    if id and not id.startswith("temp-"):
        supabase.table("card").update(data).eq("id", id).execute()
    else:
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
        supabase.table("task").update(data).eq("id", id).execute()
    else:
        data["estado"] = "To do"
        supabase.table("task").insert(data).execute()
        
    return {"status": "success"}

@app.post("/api/tareas/estado")
async def actualizar_estado_tarea(
    id: str = Form(...),
    estado: str = Form(...)
):
    supabase.table("task").update({"estado": estado}).eq("id", id).execute()
    return {"status": "success"}
