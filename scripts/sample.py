"""Build the sample PDF and its normalized paragraph anchors."""
import json
import textwrap
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

root = Path(__file__).resolve().parent.parent
paper = json.loads((root / "app/paper.json").read_text())
pdf = canvas.Canvas(str(root / "public/sample.pdf"), pagesize=(560, 720))
anchors = {}
for page in range(1, 4):
    pdf.setFillColor(HexColor("#223749"))
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(49, 674, "PAPER READER  /  TEACHING SAMPLE")
    pdf.setFillColor(HexColor("#121e2b"))
    if page == 1:
        pdf.setFont("Times-Bold", 31)
        pdf.drawString(49, 618, "Does retrieval practice")
        pdf.drawString(49, 581, "improve long-term recall?")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(49, 548, "A fictional study for practicing research reading")
    else:
        pdf.setFont("Times-Bold", 24)
        pdf.drawString(49, 620, "Retrieval practice and delayed recall")
    pdf.setStrokeColor(HexColor("#a1b0bd"))
    pdf.line(49, 526 if page == 1 else 596, 511, 526 if page == 1 else 596)
    y = 492 if page == 1 else 557
    for group in (g for g in paper["groups"] if g["page"] == page):
        pdf.setFont("Helvetica-Bold", 15)
        pdf.drawString(49, y, group["section"])
        y -= 29
        rects = []
        for paragraph, *_ in group["paragraphs"]:
            top = y + 14
            pdf.setFont("Times-Roman", 14)
            for line in textwrap.wrap(paragraph, width=77):
                assert pdf.stringWidth(line) <= 462, line
                pdf.drawString(49, y, line)
                y -= 20
            rects.append([(720-top)/720, (top-y-3)/720])
            y -= 13
        anchors[group["id"]] = rects
        y -= 16
    assert y > 45
    pdf.setFont("Helvetica", 9)
    pdf.drawString(49, 37, "FICTIONAL DATA FOR DEMONSTRATION")
    pdf.drawRightString(511, 37, f"{page} / 3")
    pdf.showPage()
pdf.save()
(root / "app/anchors.json").write_text(json.dumps(anchors, indent=2) + "\n")
