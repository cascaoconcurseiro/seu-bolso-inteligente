import type { Trip } from "@/hooks/useTrips";

interface ExportItem {
  id: string;
  date: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
}

export function exportTripToPdf(trip: Trip, items: ExportItem[]): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor, permita pop-ups para exportar o PDF do roteiro.");
    return;
  }

  // Agrupa itens por data
  const grouped: Record<string, ExportItem[]> = {};
  items.forEach((item) => {
    if (!grouped[item.date]) grouped[item.date] = [];
    grouped[item.date].push(item);
  });

  const dates = Object.keys(grouped).sort();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Roteiro de Viagem - ${trip.name}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
          padding: 40px;
          margin: 0;
          background: #fff;
        }
        .header {
          border-bottom: 2px solid #0284c7;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
        }
        .meta {
          font-size: 14px;
          color: #64748b;
        }
        .day-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .day-title {
          font-size: 18px;
          font-weight: 600;
          color: #0284c7;
          background: #f0f9ff;
          padding: 8px 14px;
          border-radius: 6px;
          margin-bottom: 12px;
          border-left: 4px solid #0284c7;
        }
        .item-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 10px;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .item-title {
          font-weight: 600;
          font-size: 15px;
        }
        .item-time {
          font-size: 13px;
          color: #0369a1;
          font-weight: 500;
          background: #e0f2fe;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .item-location {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
        .item-desc {
          font-size: 13px;
          color: #334155;
          margin-top: 6px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 10px 20px; font-weight: 600; border-radius: 6px; cursor: pointer;">
          📄 Imprimir / Salvar PDF
        </button>
      </div>

      <div class="header">
        <h1 class="title">${trip.name}</h1>
        <div class="meta">
          📍 Destino: ${trip.destination || "Não informado"} | 📅 Período: ${trip.start_date} até ${trip.end_date}
        </div>
      </div>

      ${
        dates.length === 0
          ? "<p style='color: #64748b;'>Nenhuma atividade cadastrada no roteiro.</p>"
          : dates
              .map(
                (d) => `
          <div class="day-section">
            <div class="day-title">📅 Dia: ${d}</div>
            ${grouped[d]
              .map(
                (item) => `
              <div class="item-card">
                <div class="item-header">
                  <span class="item-title">${item.title}</span>
                  ${item.start_time ? `<span class="item-time">⏰ ${item.start_time}${item.end_time ? ` - ${item.end_time}` : ""}</span>` : ""}
                </div>
                ${item.location ? `<div class="item-location">📍 ${item.location}</div>` : ""}
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ""}
              </div>
            `
              )
              .join("")}
          </div>
        `
              )
              .join("")
      }
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
