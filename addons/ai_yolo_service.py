import cv2
import numpy as np
import threading
from fastapi import FastAPI
from pydantic import BaseModel
from ultralytics import YOLO
import uvicorn
import httpx

app = FastAPI(title="Arch3r AI YOLO Service")

# 1. INIT YOLOv8 MODEL (Gunakan model 'nano' agar ringan di STB/Armbian)
# Untuk STB Armbian, sangat disarankan mengekspor model ini ke NCNN atau TFLite.
model = YOLO("yolov8n.pt") 

# Memory Store untuk konfigurasi grid (Di-update dari Node.js NVR)
class GridConfig(BaseModel):
    camera_id: str
    grid_rows: int
    grid_cols: int
    rtsp_url: str
    active_cells: list  # format: ["0,0", "0,1", "1,0", ...]

active_configs = {}

@app.post("/api/ai/config")
def update_ai_config(config: GridConfig):
    """
    Endpoint menerima koordinat grid yang diaktifkan oleh pengguna dari Web UI NVR.
    """
    active_configs[config.camera_id] = config
    
    # Restart RTSP worker untuk kamera ini jika diperlukan
    if config.camera_id not in workers:
        start_worker(config.camera_id)
        
    return {"status": "success", "message": f"Konfigurasi AI {config.camera_id} diperbarui."}

# ==============================================================
# 2. WORKER THREAD: PROSES RTSP & DETEKSI YOLO (FRAME SKIPPING)
# ==============================================================
workers = {}
stop_events = {}

def process_camera_stream(camera_id):
    config = active_configs.get(camera_id)
    if not config: return
    
    cap = cv2.VideoCapture(config.rtsp_url)
    
    # PARAMETER OPTIMASI STB:
    # Memproses setiap frame sangat memberatkan CPU. Kita akan melakukan frame-skipping
    # (Misalnya hanya menganalisis 1 frame per detik untuk deteksi manusia).
    frame_skip = int(cap.get(cv2.CAP_PROP_FPS)) or 15 
    frame_count = 0
    
    while not stop_events[camera_id].is_set() and cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        # Skip frame jika tidak sesuai kelipatan (1 fps)
        if frame_count % frame_skip != 0:
            continue
            
        # Refresh config dari memori jika pengguna mengubah grid
        config = active_configs.get(camera_id)
        if not config or not config.active_cells:
            continue
            
        # Resize frame agar inferensi lebih cepat (misal: 640x360)
        frame_resized = cv2.resize(frame, (640, 360))
        h, w, _ = frame_resized.shape
        
        # Dimensi 1 petak grid
        cell_w = w / config.grid_cols
        cell_h = h / config.grid_rows
        
        # 3. DETEKSI OBJEK (YOLO)
        # classes=[0] membatasi deteksi HANYA pada 'person' (manusia).
        results = model.predict(frame_resized, classes=[0], verbose=False)
        
        detection_found = False
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Koordinat Bounding Box Manusia
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                
                # Cek apakah titik tengah objek (cx, cy) berada di dalam grid yang diaktifkan user
                col = int(cx // cell_w)
                row = int(cy // cell_h)
                cell_id = f"{row},{col}"
                
                if cell_id in config.active_cells:
                    detection_found = True
                    print(f"[ALARM] Manusia terdeteksi di grid {cell_id} pada kamera {camera_id}!")
                    break # Trigger aktif, keluar dari loop box
                    
            if detection_found:
                # Kirim Notifikasi/Webhook ke Node.js Backend
                try:
                    httpx.post(f"http://127.0.0.1:3000/api/ai/webhook", json={
                        "camera_id": camera_id,
                        "event": "human_motion",
                        "grid_cell": cell_id
                    })
                except Exception as e:
                    pass
                break # Hindari spam trigger di frame yang sama
                
    cap.release()

def start_worker(camera_id):
    if camera_id in workers:
        stop_events[camera_id].set()
        workers[camera_id].join()
        
    stop_events[camera_id] = threading.Event()
    thread = threading.Thread(target=process_camera_stream, args=(camera_id,))
    thread.daemon = True
    thread.start()
    workers[camera_id] = thread

if __name__ == "__main__":
    print("Mulai Arch3r AI YOLO Service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
