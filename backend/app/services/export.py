import io
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from fastapi.responses import StreamingResponse

def export_to_excel(data_list: list, filename: str):
    if not data_list:
        df = pd.DataFrame()
    else:
        df = pd.DataFrame(data_list)
    
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Report")
    
    stream.seek(0)
    
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
    )

def export_to_pdf(data_list: list, filename: str, title: str):
    stream = io.BytesIO()
    c = canvas.Canvas(stream, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, title)
    
    c.setFont("Helvetica", 10)
    y_position = height - 80
    
    if not data_list:
        c.drawString(50, y_position, "No data available.")
    else:
        # Just dump the dictionary as a basic string for simplicity
        for row in data_list:
            if y_position < 50:
                c.showPage()
                y_position = height - 50
                c.setFont("Helvetica", 10)
                
            line = " | ".join([f"{k}: {v}" for k, v in row.items()])
            # Truncate line if too long
            if len(line) > 100:
                line = line[:97] + "..."
            
            c.drawString(50, y_position, line)
            y_position -= 20
            
    c.save()
    stream.seek(0)
    
    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}.pdf"}
    )
