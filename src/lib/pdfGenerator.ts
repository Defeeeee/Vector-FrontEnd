import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Flight, Aircraft, Profile } from '@/types';

export async function generateLogbookPdf(flights: Flight[], aircraftList: Aircraft[], profile: Profile | null) {
  console.log("pdfGenerator: Starting with", flights.length, "flights");
  
  // Fetch the blank PDF template
  const url = '/blank_logbook.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  // Create a new document to build the final PDF
  const finalPdf = await PDFDocument.create();
  
  // CRITICAL FIX: Embed font in the document we are actually drawing on (finalPdf)
  const helveticaFont = await finalPdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 7;
  const textColor = rgb(0, 0, 0);

  // Sort flights ascending by date for the logbook
  const sortedFlights = [...flights].sort((a, b) => new Date(a.takeoff).getTime() - new Date(b.takeoff).getTime());
  const aircraftMap = new Map(aircraftList.map(a => [a.id, a]));

  const CONFIG = {
    maxRowsPerPage: 18,
    startY: 312, // Calibration needed
    rowHeight: 12.8, 
    headerY: 388,
    yearY: 358,
    transporteY: 62,
    cols: {
      dia: 55, mes: 73, horaSalida: 87, origen: 115, destino: 165, horaLlegada: 200, finalidad: 228,
      marca: 248, matricula: 278, potencia: 312, clase: 338,
      diaPiloto: 368, diaCopiloto: 395, nochePiloto: 422, nocheCopiloto: 448,
      travDiaPiloto: 476, travDiaCopiloto: 504, travNochePiloto: 532, travNocheCopiloto: 560,
      aterrizajes: 590,
      totalHoras: 940
    }
  };

  const splitRoute = (route: string): [string, string] => {
    const r = route || "";
    if (r.includes('-')) {
      const [o, d] = r.split('-');
      return [o?.trim() || "", d?.trim() || ""];
    }
    const parts = r.trim().split(/\s+/);
    return [parts[0] || "", parts[1] || ""];
  };

  const runningTotals = {
    diaPiloto: 0, diaCopiloto: 0, nochePiloto: 0, nocheCopiloto: 0,
    travDiaPiloto: 0, travDiaCopiloto: 0, travNochePiloto: 0, travNocheCopiloto: 0,
    aterrizajes: 0, totalHoras: 0
  };

  const totalPages = Math.ceil(sortedFlights.length / CONFIG.maxRowsPerPage) || 1;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const [newPage] = await finalPdf.copyPages(pdfDoc, [0]);
    finalPdf.addPage(newPage);

    // Draw Headers
    const name = profile ? `${profile.last_name}, ${profile.first_name}`.toUpperCase() : "PILOTO NO IDENTIFICADO";
    const license = profile?.license_type?.toUpperCase() || "N/A";
    
    newPage.drawText(name, { x: 50, y: CONFIG.headerY, size: 9, font: helveticaBold, color: textColor });
    newPage.drawText(license, { x: 375, y: CONFIG.headerY, size: 9, font: helveticaBold, color: textColor });
    
    const startIndex = pageIndex * CONFIG.maxRowsPerPage;
    const pageYear = sortedFlights[startIndex] ? new Date(sortedFlights[startIndex].date + 'T00:00:00').getFullYear().toString() : new Date().getFullYear().toString();
    newPage.drawText(pageYear, { x: 60, y: CONFIG.yearY, size: 9, font: helveticaBold, color: textColor });

    const endIndex = Math.min(startIndex + CONFIG.maxRowsPerPage, sortedFlights.length);
    for (let i = startIndex; i < endIndex; i++) {
      const flight = sortedFlights[i];
      const ac = flight.aircraft_id ? aircraftMap.get(flight.aircraft_id) : undefined;
      const rowIndex = i % CONFIG.maxRowsPerPage;
      const currentY = CONFIG.startY - (rowIndex * CONFIG.rowHeight);
      
      const dateObj = new Date(flight.date + 'T00:00:00');
      const day = dateObj.getDate().toString();
      const month = (dateObj.getMonth() + 1).toString();
      
      const takeoffStr = new Date(flight.takeoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });
      const landingStr = new Date(flight.landing).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });
      const [origin, dest] = splitRoute(flight.route);

      const drawVal = (text: any, x: number) => {
        if (text === undefined || text === null || text === "" || text === 0) return;
        const str = text.toString();
        newPage.drawText(str, { x, y: currentY, size: fontSize, font: helveticaFont, color: textColor });
      };

      drawVal(day, CONFIG.cols.dia);
      drawVal(month, CONFIG.cols.mes);
      drawVal(takeoffStr, CONFIG.cols.horaSalida);
      drawVal(origin.toUpperCase(), CONFIG.cols.origen);
      drawVal(dest.toUpperCase(), CONFIG.cols.destino);
      drawVal(landingStr, CONFIG.cols.horaLlegada);
      drawVal("VP", CONFIG.cols.finalidad); 
      
      if (ac) {
        drawVal(ac.type.split(' ')[0].substring(0, 6).toUpperCase(), CONFIG.cols.marca);
        drawVal(ac.registration.toUpperCase(), CONFIG.cols.matricula);
        drawVal("100HP", CONFIG.cols.potencia);
        drawVal(ac.type_acft?.toUpperCase(), CONFIG.cols.clase);
      }

      drawVal(flight.pic_day_loc, CONFIG.cols.diaPiloto);
      runningTotals.diaPiloto += (flight.pic_day_loc || 0);

      drawVal(flight.pic_day_tra, CONFIG.cols.travDiaPiloto);
      runningTotals.travDiaPiloto += (flight.pic_day_tra || 0);

      drawVal(flight.pic_night_loc, CONFIG.cols.nochePiloto);
      runningTotals.nochePiloto += (flight.pic_night_loc || 0);
      
      drawVal(flight.pic_night_tra, CONFIG.cols.travNochePiloto);
      runningTotals.travNochePiloto += (flight.pic_night_tra || 0);

      drawVal(flight.sic_day_loc, CONFIG.cols.diaCopiloto);
      runningTotals.diaCopiloto += (flight.sic_day_loc || 0);

      drawVal(flight.sic_night_loc, CONFIG.cols.nocheCopiloto);
      runningTotals.nocheCopiloto += (flight.sic_night_loc || 0);
      
      drawVal(flight.landings, CONFIG.cols.aterrizajes);
      runningTotals.aterrizajes += flight.landings;

      drawVal(flight.duration.toFixed(1), CONFIG.cols.totalHoras);
      runningTotals.totalHoras += flight.duration;
    }

    const drawTotal = (val: number, x: number) => {
      if (val <= 0) return;
      const str = val % 1 === 0 ? val.toString() : val.toFixed(1);
      newPage.drawText(str, { x, y: CONFIG.transporteY, size: 8, font: helveticaBold, color: textColor });
    };

    drawTotal(runningTotals.diaPiloto, CONFIG.cols.diaPiloto);
    drawTotal(runningTotals.travDiaPiloto, CONFIG.cols.travDiaPiloto);
    drawTotal(runningTotals.nochePiloto, CONFIG.cols.nochePiloto);
    drawTotal(runningTotals.travNochePiloto, CONFIG.cols.travNochePiloto);
    drawTotal(runningTotals.diaCopiloto, CONFIG.cols.diaCopiloto);
    drawTotal(runningTotals.nocheCopiloto, CONFIG.cols.nocheCopiloto);
    drawTotal(runningTotals.aterrizajes, CONFIG.cols.aterrizajes);
    drawTotal(runningTotals.totalHoras, CONFIG.cols.totalHoras);
  }

  console.log("pdfGenerator: Finalizing PDF...");
  return await finalPdf.save();
}
