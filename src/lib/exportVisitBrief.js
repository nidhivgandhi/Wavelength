import { jsPDF } from "jspdf";

// analysisData is optional — your teammate will wire in the real values:
//   { summary: "string from generateEntrySummary()", chartImageDataUrl: "data:image/png;base64,..." }
// Until then this renders clearly-labeled placeholders so the layout is visible.
export function exportVisitBriefToPDF(patientData, translatedEntries, analysisData = {}) {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, 210, 35, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Patient Visit Brief — Wavelength", 14, 22);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 145, 22);

    doc.setTextColor(50, 50, 50);
    yPos = 45;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Patient Overview", 14, yPos);
    yPos += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Focus Area / Context: ${patientData?.focusArea || "General Symptom Tracking"}`, 14, yPos);
    yPos += 15;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Structured Symptom Analysis (For Clinical Review)", 14, yPos);
    yPos += 8;

    if (translatedEntries && translatedEntries.length > 0) {
        translatedEntries.forEach((entry, index) => {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFont(undefined, "bold");
            doc.setFontSize(10);
            doc.setTextColor(109, 40, 217);
            doc.text(`Entry Item ${index + 1}`, 14, yPos);
            yPos += 6;

            doc.setFont(undefined, "bold");
            doc.setTextColor(50, 50, 50);
            doc.text("Clinical Phrasing:", 14, yPos);
            doc.setFont(undefined, "normal");
            doc.text(entry.clinical_phrasing || "N/A", 48, yPos, { maxWidth: 145 });
            yPos += 12;

            doc.setFont(undefined, "bold");
            doc.text("Why It Matters:", 14, yPos);
            doc.setFont(undefined, "normal");
            doc.text(entry.why_it_matters || "N/A", 48, yPos, { maxWidth: 145 });
            yPos += 12;

            doc.setFont(undefined, "bold");
            doc.text("Follow-up:", 14, yPos);
            doc.setFont(undefined, "normal");
            doc.text(entry.follow_up_question || "N/A", 48, yPos, { maxWidth: 145 });
            yPos += 16;
        });
    } else {
        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        doc.text("No translated symptom entries available for export.", 14, yPos);
        yPos += 10;
    }

    // ---- Symptom pattern graph (placeholder until wired to a real chart) ----
    if (yPos > 220) {
        doc.addPage();
        yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(109, 40, 217);
    doc.text("Symptom Pattern", 14, yPos);
    yPos += 8;

    if (analysisData.chartImageDataUrl) {
        // Expects a PNG/JPEG data URL, e.g. captured from the AnalysisView chart
        // via a canvas .toDataURL() call before this function runs.
        doc.addImage(analysisData.chartImageDataUrl, "PNG", 14, yPos, 182, 70);
        yPos += 78;
    } else {
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(14, yPos, 182, 60);
        doc.setLineDashPattern([], 0);
        doc.setFont(undefined, "italic");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("Chart placeholder — pass analysisData.chartImageDataUrl to render the real graph", 20, yPos + 32, { maxWidth: 170 });
        yPos += 68;
    }

    // ---- AI analysis summary (placeholder until wired to generateEntrySummary) ----
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(109, 40, 217);
    doc.text("AI Analysis Summary", 14, yPos);
    yPos += 8;

    doc.setFont(undefined, analysisData.summary ? "normal" : "italic");
    doc.setFontSize(10);
    doc.setTextColor(analysisData.summary ? 50 : 150, analysisData.summary ? 50 : 150, analysisData.summary ? 50 : 150);
    doc.text(
        analysisData.summary || "Summary placeholder — pass analysisData.summary (e.g. from generateEntrySummary()) to render the real analysis.",
        14,
        yPos,
        { maxWidth: 182 }
    );

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, "normal");
    doc.text("Generated via Wavelength — Designed to support efficient, objective physician communication.", 14, 285);

    doc.save("wavelength-visit-brief.pdf");
}