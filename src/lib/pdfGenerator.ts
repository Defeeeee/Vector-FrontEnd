import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Flight, Aircraft, Profile } from '@/types';

export async function generateLogbookPdf(flights: Flight[], aircraftList: Aircraft[], profile: Profile | null) {
  // Fetch the blank PDF template
  const url = '/blank_logbook.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 8;
  const textColor = rgb(0, 0, 0);

  // We need the original page to copy from for subsequent pages
  const originalPage = pdfDoc.getPages()[0];
  const { width, height } = originalPage.getSize();
  
  // Create a new document to build the final PDF
  const finalPdf = await PDFDocument.create();
  
  // Sort flights ascending by date for the logbook
  const sortedFlights = [...flights].sort((a, b) => new Date(a.takeoff).getTime() - new Date(b.takeoff).getTime());
  const aircraftMap = new Map(aircraftList.map(a => [a.id, a]));

  // Configuration for coordinates (origin 0,0 is bottom-left)
  // HEIGHT: ~419.5, WIDTH: ~1190.5
  // Note: These coordinates are approximate and should be fine-tuned
  const CONFIG = {
    maxRowsPerPage: 18,
    startY: 300, // Y coord of the first row
    rowHeight: 12.8, // Distance between rows
    
    // Header Y positions
    headerY: 385,
    yearY: 355,
    
    // Footer Y positions
    transporteY: 60, // Transporte al frente (bottom)
    
    // Column X positions (Approximate, to be adjusted)
    cols: {
      dia: 55,
      mes: 75,
      horaSalida: 95,
      origen: 130,
      destino: 175,
      horaLlegada: 215,
      finalidad: 235,
      marca: 255,
      matricula: 285,
      potencia: 315,
      clase: 340,
      
      // Tiempos
      diaPiloto: 365,
      diaCopiloto: 395,
      nochePiloto: 425,
      nocheCopiloto: 450,
      travDiaPiloto: 480,
      travDiaCopiloto: 505,
      travNochePiloto: 535,
      travNocheCopiloto: 560,
      
      aterrizajes: 590,
      
      // Discriminacion
      instructor: 620,
      multimotor: 650,
      reactor: 680,
      turbohelice: 710,
      aeroaplicador: 735,
      instruPiloto: 760,
      instruCopiloto: 785,
      capota: 815,
      
      // Simulador
      simInstructor: 845,
      simPiloto: 875,
      
      // Certificaciones / Totales
      totalHoras: 940 // Assume total goes here or under certs
    }
  };

  // Helper to split route
  const splitRoute = (route: string): [string, string] => {
    if (route.includes('-')) {
      const [o, d] = route.split('-');
      return [o?.trim() || "", d?.trim() || ""];
    }
    const parts = route.trim().split(/\s+/);
    return [parts[0] || "", parts[1] || ""];
  };

  // Running totals across all pages
  const runningTotals = {
    diaPiloto: 0,
    diaCopiloto: 0,
    nochePiloto: 0,
    nocheCopiloto: 0,
    travDiaPiloto: 0,
    travDiaCopiloto: 0,
    travNochePiloto: 0,
    travNocheCopiloto: 0,
    aterrizajes: 0,
    totalHoras: 0
  };

  const totalPages = Math.ceil(sortedFlights.length / CONFIG.maxRowsPerPage) || 1;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    // Copy the blank template for this new page
    const [newPage] = await finalPdf.copyPages(pdfDoc, [0]);
    finalPdf.addPage(newPage);

    // Draw Headers (Name, License, etc.)
    const name = profile ? `${profile.last_name}, ${profile.first_name}` : "PILOTO NO IDENTIFICADO";
    const license = profile?.license_type || "N/A";
    
    newPage.drawText(name, { x: 180, y: CONFIG.headerY, size: 10, font: helveticaFont, color: textColor });
    newPage.drawText(license, { x: 400, y: CONFIG.headerY, size: 10, font: helveticaFont, color: textColor });
    // Assuming year is from the first flight on this page
    const startIndex = pageIndex * CONFIG.maxRowsPerPage;
    const pageYear = sortedFlights[startIndex] ? new Date(sortedFlights[startIndex].date).getFullYear().toString() : new Date().getFullYear().toString();
    newPage.drawText(pageYear, { x: 60, y: CONFIG.yearY, size: 10, font: helveticaFont, color: textColor });

    // "Suma Anterior" for pages > 0 is usually written on the first line or specific box.
    // For simplicity, we skip drawing the 'Suma Anterior' row explicitly unless there is a dedicated row for it, 
    // but the user can add it by mapping to the 'Totales Pagina Anterior' line if coordinates are known.

    // Process rows for this page
    const endIndex = Math.min(startIndex + CONFIG.maxRowsPerPage, sortedFlights.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const flight = sortedFlights[i];
      const ac = flight.aircraft_id ? aircraftMap.get(flight.aircraft_id) : undefined;
      const rowIndex = i % CONFIG.maxRowsPerPage;
      const currentY = CONFIG.startY - (rowIndex * CONFIG.rowHeight);
      
      const dateObj = new Date(flight.date + 'T00:00:00');
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      
      const takeoffStr = new Date(flight.takeoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });
      const landingStr = new Date(flight.landing).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });
      const [origin, dest] = splitRoute(flight.route);

      // Draw standard text
      const drawText = (text: string | number | undefined, x: number) => {
        if (text === undefined || text === null || text === 0 || text === "0" || text === "0.0") return;
        const str = text.toString();
        newPage.drawText(str, { x, y: currentY, size: fontSize, font: helveticaFont, color: textColor });
      };

      drawText(day, CONFIG.cols.dia);
      drawText(month, CONFIG.cols.mes);
      drawText(takeoffStr, CONFIG.cols.horaSalida);
      drawText(origin, CONFIG.cols.origen);
      drawText(dest, CONFIG.cols.destino);
      drawText(landingStr, CONFIG.cols.horaLlegada);
      drawText("ENT", CONFIG.cols.finalidad); // Example default
      
      if (ac) {
        drawText(ac.type.substring(0, 5), CONFIG.cols.marca);
        drawText(ac.registration, CONFIG.cols.matricula);
        drawText("100HP", CONFIG.cols.potencia); // Need to add to schema if variable
        drawText(ac.type_acft, CONFIG.cols.clase);
      }

      // Tiempos (Logic mapping)
      // Since flight duration is split into these, we map accordingly
      drawText(flight.pic_day_loc, CONFIG.cols.diaPiloto);
      runningTotals.diaPiloto += (flight.pic_day_loc || 0);

      drawText(flight.pic_day_tra, CONFIG.cols.travDiaPiloto);
      runningTotals.travDiaPiloto += (flight.pic_day_tra || 0);

      drawText(flight.pic_night_loc, CONFIG.cols.nochePiloto);
      runningTotals.nochePiloto += (flight.pic_night_loc || 0);
      
      drawText(flight.pic_night_tra, CONFIG.cols.travNochePiloto);
      runningTotals.travNochePiloto += (flight.pic_night_tra || 0);

      drawText(flight.sic_day_loc, CONFIG.cols.diaCopiloto);
      runningTotals.diaCopiloto += (flight.sic_day_loc || 0);

      drawText(flight.sic_night_loc, CONFIG.cols.nocheCopiloto);
      runningTotals.nocheCopiloto += (flight.sic_night_loc || 0);
      
      drawText(flight.landings, CONFIG.cols.aterrizajes);
      runningTotals.aterrizajes += flight.landings;

      drawText(flight.duration.toFixed(1), CONFIG.cols.totalHoras);
      runningTotals.totalHoras += flight.duration;
    }

    // Draw 'Transporte a la Pagina Siguiente' totals at the bottom
    const drawTotal = (val: number, x: number) => {
      if (val <= 0) return;
      // Truncate to 1 decimal
      const str = val % 1 === 0 ? val.toString() : val.toFixed(1);
      newPage.drawText(str, { x, y: CONFIG.transporteY, size: 9, font: helveticaFont, color: textColor });
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

  return await finalPdf.save();
}
