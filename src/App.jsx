import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const INIT = [
  { id: 1, name: "Medicinbal 2kg", stock: 16, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 20.51, loans: [] },
  { id: 2, name: "Medicinbal 1,5kg", stock: 2, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 20.51, loans: [] },
  { id: 3, name: "Medicinbal 1kg", stock: 2, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 20.51, loans: [] },
  { id: 4, name: "UniHockey sticks + balletjes (20sticks)", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 120.94, loans: [] },
  { id: 5, name: "Fhuttle", stock: 23, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.2, loans: [] },
  { id: 6, name: "Stopwatch", stock: 5, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 13.25, loans: [] },
  { id: 7, name: "Horden hoog", stock: 9, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 18.09, loans: [] },
  { id: 8, name: "Streethockey sticks incl. puck (11sticks)", stock: 1, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 365.0, loans: [] },
  { id: 9, name: "Pylon klein (rood)", stock: 12, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 10, name: "Autoband", stock: 4, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 11, name: "Horden laag", stock: 18, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 14.22, loans: [] },
  { id: 12, name: "Knotshockey sticks incl. bal (12sticks)", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 131.83, loans: [] },
  { id: 13, name: "Pylon klein (oranje)", stock: 25, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.71, loans: [] },
  { id: 14, name: "Paaltje met vlag", stock: 16, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 15, name: "Estafettestokje", stock: 13, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 2.84, loans: [] },
  { id: 16, name: "Golfset incl. ballen", stock: 50, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 20.0, loans: [] },
  { id: 17, name: "pylon groot", stock: 25, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.4, loans: [] },
  { id: 18, name: "Blauwe prikkers", stock: 40, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.0, loans: [] },
  { id: 19, name: "Kogel 3 kilo", stock: 6, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 16.25, loans: [] },
  { id: 20, name: "Freeplayer", stock: 4, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 2147.75, loans: [] },
  { id: 21, name: "Markeerpylon (dopjes) (set)", stock: 8, unit: "set", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 35.7, loans: [] },
  { id: 22, name: "Matjes (ikea)", stock: 8, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.0, loans: [] },
  { id: 23, name: "Kogel 2 kilo", stock: 6, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 15.13, loans: [] },
  { id: 24, name: "Korfbal", stock: 2, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0.0, loans: [] },
  { id: 25, name: "Basketbal (multi-net set)", stock: 2, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0.0, loans: [] },
  { id: 26, name: "Multi-net", stock: 2, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0.0, loans: [] },
  { id: 27, name: "hoepels kleind", stock: 12, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 28, name: "Blikgooiset", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 34.85, loans: [] },
  { id: 29, name: "kogel kunststof", stock: 12, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 30, name: "schietschijf boogschieten", stock: 13, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 32.99, loans: [] },
  { id: 31, name: "Hoepels", stock: 25, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 4.17, loans: [] },
  { id: 32, name: "Parachute klein", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 49.61, loans: [] },
  { id: 33, name: "Speer 500gram", stock: 6, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 65.95, loans: [] },
  { id: 34, name: "Schietschijf boogschieten fun", stock: 3, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 14.99, loans: [] },
  { id: 35, name: "Trapeze stok", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 158.27, loans: [] },
  { id: 36, name: "Parachute groot", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 102.55, loans: [] },
  { id: 37, name: "Speer 400gram", stock: 6, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 62.01, loans: [] },
  { id: 38, name: "boog boogschieten", stock: 14, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 27.99, loans: [] },
  { id: 39, name: "Hesjes", stock: 47, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 4.78, loans: [] },
  { id: 40, name: "Unihockey doeltje", stock: 4, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 30.0, loans: [] },
  { id: 41, name: "Meetlint", stock: 7, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 24.01, loans: [] },
  { id: 42, name: "easy boogschieten", stock: 3, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.99, loans: [] },
  { id: 43, name: "Lintje rood", stock: 27, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.11, loans: [] },
  { id: 44, name: "Stoeprand set", stock: 7, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 175.45, loans: [] },
  { id: 45, name: "meetlint stof", stock: 1, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 46, name: "pijlen boogschieten (20 totaal)", stock: 10, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.99, loans: [] },
  { id: 47, name: "Lintje marineblauw", stock: 12, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.11, loans: [] },
  { id: 48, name: "Beweegfishes", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 20.51, loans: [] },
  { id: 49, name: "Krijtbordje", stock: 11, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 5.0, loans: [] },
  { id: 50, name: "archerytag set (2 doelen, 12 bogen, 30 pijlen, 12 maskers)", stock: 1, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 650.0, loans: [] },
  { id: 51, name: "Lintje donkerblauw", stock: 10, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.11, loans: [] },
  { id: 52, name: "Ballauncher", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 53, name: "Loopladder", stock: 1, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 24.81, loans: [] },
  { id: 54, name: "Flagball set", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 49.61, loans: [] },
  { id: 55, name: "Lintje lichtblauw", stock: 12, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.11, loans: [] },
  { id: 56, name: "zandlopers", stock: 5, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 24.81, loans: [] },
  { id: 57, name: "Startklapper", stock: 3, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 54.39, loans: [] },
  { id: 58, name: "Rampshot set", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 116.77, loans: [] },
  { id: 59, name: "Lintje Geel", stock: 4, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.11, loans: [] },
  { id: 60, name: "knijpfluit", stock: 4, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.62, loans: [] },
  { id: 61, name: "discus", stock: 6, unit: "stuk", category: "Atletiek", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 62, name: "Kanjam (brievenbussen)", stock: 17, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 42.29, loans: [] },
  { id: 63, name: "Lintje oranje", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.11, loans: [] },
  { id: 64, name: "muziekbox", stock: 2, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 450.0, loans: [] },
  { id: 65, name: "Spike ball set", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 108.3, loans: [] },
  { id: 66, name: "schijven met cijfers", stock: 2, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 67, name: "gewichten", stock: 12, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 11.07, loans: [] },
  { id: 68, name: "ultimate frisbeeset", stock: 1, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 69, name: "Ringen", stock: 20, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 4.54, loans: [] },
  { id: 70, name: "haspel", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 100.0, loans: [] },
  { id: 71, name: "Chinese bordjes", stock: 6, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 72, name: "Swingball", stock: 4, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 72.54, loans: [] },
  { id: 73, name: "Slagbal plank", stock: 4, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 10.41, loans: [] },
  { id: 74, name: "ballenpomp elektrisch", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 200.0, loans: [] },
  { id: 75, name: "stokken chinese bordjes", stock: 2, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 76, name: "frisbeedoelen", stock: 4, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 54.15, loans: [] },
  { id: 77, name: "slagbalknuppels", stock: 4, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 21.72, loans: [] },
  { id: 78, name: "stokpaardjes", stock: 4, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 35.0, loans: [] },
  { id: 79, name: "Jongleerdoekjes", stock: 11, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 80, name: "lacrosse set", stock: 1, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 81, name: "slagstatief", stock: 4, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 37.33, loans: [] },
  { id: 82, name: "watertonnen", stock: 3, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 90.0, loans: [] },
  { id: 83, name: "Stokje met sierlint", stock: 5, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 84, name: "honkenset", stock: 2, unit: "set", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 21.48, loans: [] },
  { id: 85, name: "vouwfiets", stock: 2, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 229.99, loans: [] },
  { id: 86, name: "Pedalo", stock: 1, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 156.7, loans: [] },
  { id: 87, name: "honkbalhandschoen links", stock: 17, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 48.34, loans: [] },
  { id: 88, name: "partytent", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 100.0, loans: [] },
  { id: 89, name: "Jongleerballen", stock: 14, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 90, name: "KUBB spel", stock: 3, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 42.96, loans: [] },
  { id: 91, name: "honkbalhandschoen rechts", stock: 5, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 48.34, loans: [] },
  { id: 92, name: "EHBOset", stock: 2, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 60.0, loans: [] },
  { id: 93, name: "Jongleerstokken set van 3", stock: 1, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 94, name: "skateboards", stock: 7, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 45.07, loans: [] },
  { id: 95, name: "Frisbee soft klein", stock: 10, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.04, loans: [] },
  { id: 96, name: "tafelrandverhoger", stock: 2, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 3.57, loans: [] },
  { id: 97, name: "Jongleerringen", stock: 5, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 98, name: "pennyboards", stock: 10, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 44.17, loans: [] },
  { id: 99, name: "Frisbee plastic groot", stock: 13, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 18.09, loans: [] },
  { id: 100, name: "movecube", stock: 3, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 30.0, loans: [] },
  { id: 101, name: "Marionette sets", stock: 3, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 102, name: "Scoop set", stock: 19, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 6.0, loans: [] },
  { id: 103, name: "fribee kanjam", stock: 4, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 11.19, loans: [] },
  { id: 104, name: "dobbelsteen", stock: 4, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.4, loans: [] },
  { id: 105, name: "Diabolo set", stock: 9, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 16.52, loans: [] },
  { id: 106, name: "Schaakbord", stock: 44, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 17.0, loans: [] },
  { id: 107, name: "Frisbee prut", stock: 8, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 16.76, loans: [] },
  { id: 108, name: "schuif jeu de boules", stock: 2, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 23.6, loans: [] },
  { id: 109, name: "Diabolo stokken", stock: 2, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 4.48, loans: [] },
  { id: 110, name: "Schaakset", stock: 44, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 111, name: "Loopklos set", stock: 7, unit: "set", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 5.99, loans: [] },
  { id: 112, name: "pilonhoezen set", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.5, loans: [] },
  { id: 113, name: "circussetprijs", stock: 1, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 393.25, loans: [] },
  { id: 114, name: "Croquetspel", stock: 2, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 27.0, loans: [] },
  { id: 115, name: "Steppingstones set", stock: 1, unit: "set", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 60.44, loans: [] },
  { id: 116, name: "schietschijf", stock: 3, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 14.99, loans: [] },
  { id: 117, name: "Jongeleerset Master", stock: 1, unit: "stuk", category: "Circus", status: "available", location: "Opslag", notes: "", pricePerUnit: 273.46, loans: [] },
  { id: 118, name: "bowlingset", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 37.69, loans: [] },
  { id: 119, name: "Kruiptunnel", stock: 7, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 14.99, loans: [] },
  { id: 120, name: "kruisboog", stock: 3, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.99, loans: [] },
  { id: 121, name: "bowlingset origineel", stock: 2, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 150.0, loans: [] },
  { id: 122, name: "Touwtrektouw", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 82.89, loans: [] },
  { id: 123, name: "smartclips", stock: 2, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 2395.8, loans: [] },
  { id: 124, name: "Toverkoord", stock: 5, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 10.83, loans: [] },
  { id: 125, name: "Fitness band licht", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 32.99, loans: [] },
  { id: 126, name: "Badmintonrackets groot", stock: 19, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.04, loans: [] },
  { id: 127, name: "Grootspringtouw", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.62, loans: [] },
  { id: 128, name: "Fitness band medium", stock: 1, unit: "stuk", category: "Extra", status: "available", location: "Opslag", notes: "", pricePerUnit: 39.99, loans: [] },
  { id: 129, name: "Badmintonrackets klein", stock: 7, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 11.5, loans: [] },
  { id: 130, name: "Basketbal", stock: 20, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 18.45, loans: [] },
  { id: 131, name: "Springtouw", stock: 12, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 3.21, loans: [] },
  { id: 132, name: "Tennisrackets groot", stock: 2, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 24.14, loans: [] },
  { id: 133, name: "Straatvoetbal", stock: 5, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 18.09, loans: [] },
  { id: 134, name: "Pittenzakje", stock: 43, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 1.98, loans: [] },
  { id: 135, name: "Tennisrackets klein", stock: 4, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 21.72, loans: [] },
  { id: 136, name: "freestyle voetbal", stock: 1, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 137, name: "Gymbal", stock: 5, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 25.95, loans: [] },
  { id: 138, name: "Tennisrackets plastic", stock: 21, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.04, loans: [] },
  { id: 139, name: "korfbal", stock: 11, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 30.1, loans: [] },
  { id: 140, name: "Kunststof gymstok", stock: 10, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 3.57, loans: [] },
  { id: 141, name: "Pingpong batje", stock: 15, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 7.09, loans: [] },
  { id: 142, name: "Foambal groot", stock: 14, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 20.51, loans: [] },
  { id: 143, name: "Volwassen bokshandschoen", stock: 2, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 48.34, loans: [] },
  { id: 144, name: "Foambal klein", stock: 5, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 10.83, loans: [] },
  { id: 145, name: "Kinder bokshandschoenen", stock: 24, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 31.37, loans: [] },
  { id: 146, name: "gele ballen", stock: 6, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 147, name: "Stootkussens", stock: 10, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 59.9, loans: [] },
  { id: 148, name: "oranje ballen", stock: 3, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 149, name: "Vortex", stock: 16, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 22.93, loans: [] },
  { id: 150, name: "bal ondefinieerbaar", stock: 3, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 151, name: "Tikhesje", stock: 8, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 21.18, loans: [] },
  { id: 152, name: "spot kleuren set (per stuk)", stock: 13, unit: "set", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 153, name: "Mikschijven klittenband", stock: 8, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 27.77, loans: [] },
  { id: 154, name: "lapjesbal", stock: 2, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 24.14, loans: [] },
  { id: 155, name: "klittenbandhandschoen", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 156, name: "Berebal", stock: 3, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 5.0, loans: [] },
  { id: 157, name: "cornhole set", stock: 2, unit: "set", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 158, name: "Volleybal", stock: 10, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 30.86, loans: [] },
  { id: 159, name: "draaitol", stock: 2, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 160, name: "roze ballen", stock: 5, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 22.93, loans: [] },
  { id: 161, name: "ringwerpen set", stock: 1, unit: "set", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 162, name: "rugbyballen", stock: 5, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 21.72, loans: [] },
  { id: 163, name: "tafelcurling", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 164, name: "blauwe ballen (james bonsspel)", stock: 11, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 22.93, loans: [] },
  { id: 165, name: "werpspel (stof)", stock: 2, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 166, name: "honkballen groot", stock: 10, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 5.99, loans: [] },
  { id: 167, name: "netjes", stock: 2, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 168, name: "totaal", stock: 1, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 169, name: "honkballen klein", stock: 16, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 6.17, loans: [] },
  { id: 170, name: "tafel jeu de boules", stock: 1, unit: "stuk", category: "Gymmateriaal", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 171, name: "39497.69", stock: 1, unit: "stuk", category: "Racketsport", status: "available", location: "Opslag", notes: "", pricePerUnit: 0, loans: [] },
  { id: 172, name: "Tennisballen (60)", stock: 1, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 103.46, loans: [] },
  { id: 173, name: "Softtennisbal", stock: 12, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 2.66, loans: [] },
  { id: 174, name: "Shuttles (set van 6)", stock: 5, unit: "set (6 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 14.46, loans: [] },
  { id: 175, name: "Pingpong balletjes (set van 100)", stock: 1, unit: "set (100 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 62.32, loans: [] },
  { id: 176, name: "kaatsballen (set van 4)", stock: 3, unit: "set (4 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.62, loans: [] },
  { id: 177, name: "kleine ballen (set van 12)", stock: 5, unit: "set (12 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.04, loans: [] },
  { id: 178, name: "Tennisballen (60)", stock: 1, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 103.46, loans: [] },
  { id: 179, name: "Softtennisbal", stock: 12, unit: "stuk", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 2.66, loans: [] },
  { id: 180, name: "Shuttles (set van 6)", stock: 5, unit: "set (6 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 14.46, loans: [] },
  { id: 181, name: "Pingpong balletjes (set van 100)", stock: 1, unit: "set (100 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 62.32, loans: [] },
  { id: 182, name: "kaatsballen (set van 4)", stock: 3, unit: "set (4 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 9.62, loans: [] },
  { id: 183, name: "kleine ballen (set van 12)", stock: 5, unit: "set (12 st)", category: "Sport sets", status: "available", location: "Opslag", notes: "", pricePerUnit: 12.04, loans: [] }
];

const CATS = ["Alle", "Atletiek", "Circus", "Racketsport", "Sport sets", "Gymmateriaal", "Extra"];
const getIcon = (c) => ({ Atletiek: "\ud83c\udfc3", Circus: "\ud83c\udfaa", Racketsport: "\ud83c\udff8", "Sport sets": "\u26bd", Gymmateriaal: "\ud83e\udd38", Extra: "\ud83d\udce6" }[c] || "\ud83c\udfc5");
const fmt = (n) => typeof n === "number" && n > 0 ? "\u20ac" + n.toFixed(2).replace(".", ",") : "-";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "";
const fmtDT = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const today = () => new Date().toISOString().split("T")[0];
const isoNow = () => new Date().toISOString();

const USERS = [
  { username: "admin", password: "admin123", role: "admin", label: "Beheerder" },
  { username: "gebruiker1", password: "welkom123", role: "user", label: "Gebruiker 1" },
];

const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const DEFAULT_BRANDING = { logo: "", title: "Materiaalhok", subtitle: "Beweegteam Opsterland", color: "#2563eb", loginBg: "" };

// --- Stock & Bon helpers ---
function loanedQty(bons, itemId) {
  let t = 0;
  bons.forEach(b => { if (b.status === "active") b.items.forEach(i => { if (i.itemId === itemId) t += (i.qty - (i.returned || 0)); }); });
  return t;
}
function reservedQty(bons, itemId, startDate, endDate) {
  let t = 0;
  bons.forEach(b => {
    if (b.status === "reserved" && !(b.endDate < startDate || b.startDate > endDate)) {
      b.items.forEach(i => { if (i.itemId === itemId) t += i.qty; });
    }
  });
  return t;
}
function unavailableQty(bons, itemId) {
  let t = 0;
  bons.forEach(b => { if (b.status !== "completed") b.items.forEach(i => { if (i.itemId === itemId) t += (i.qty - (i.returned || 0)); }); });
  return t;
}
function availQty(item, bons) { return item.stock - unavailableQty(bons, item.id) - (item.maintenance || 0); }
function bonIsOverdue(b) { return b.status !== "completed" && b.endDate && new Date(b.endDate) < new Date(); }
function bonRemaining(b) { return b.items.filter(i => (i.qty - (i.returned || 0)) > 0); }
function bonComplete(b) { return b.items.every(i => (i.returned || 0) >= i.qty); }
function genBonNr() { const d = new Date(); return `BON-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`; }

// --- Image helper ---
function readFile(file, cb) {
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

function ImageUpload({ value, onChange, label, className }) {
  const ref = useRef();
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? <img src={value} className="w-16 h-16 rounded-xl object-cover border border-gray-200" alt=""/> : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-dashed border-gray-300">Geen</div>}
        <div className="flex flex-col gap-1">
          <button onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">{value ? "Wijzig" : "Upload"}</button>
          {value && <button onClick={() => onChange("")} className="px-3 py-1.5 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50">Verwijder</button>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, onChange); e.target.value = ""; }}/>
    </div>
  );
}

function ItemPhoto({ photo, size }) {
  const s = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  if (photo) return <img src={photo} className={`${s} rounded-xl object-cover`} alt=""/>;
  return null;
}

// --- Barcode ---
function generateBarcode(id) {
  const str = String(id).padStart(8, '0');
  let bars = "11010010000";
  for (const ch of str) { const p = ["11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000"]; bars += p[parseInt(ch)] || p[0]; }
  bars += "1100011101011"; return bars;
}
function BarcodeSVG({ id, name, small }) {
  const bars = generateBarcode(id); const w = small ? 160 : 280, h = small ? 50 : 80, bw = w / bars.length;
  return <svg viewBox={`0 0 ${w} ${h+(small?18:30)}`} width={w} height={h+(small?18:30)} className="bg-white">{bars.split('').map((b,i)=>b==='1'?<rect key={i} x={i*bw} y={2} width={bw} height={h} fill="black"/>:null)}<text x={w/2} y={h+(small?12:18)} textAnchor="middle" fontSize={small?9:12} fontFamily="monospace">{String(id).padStart(8,'0')}</text>{!small&&<text x={w/2} y={h+28} textAnchor="middle" fontSize={9} fontFamily="sans-serif" fill="#666">{name}</text>}</svg>;
}

// --- UI ---
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40"/>
    <div className={`relative bg-white rounded-2xl shadow-2xl ${wide?"max-w-3xl":"max-w-lg"} w-full mx-4 max-h-[90vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5L5 15M5 5l10 10"/></svg></button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  </div>;
}
function Stat({ label, value, color, icon }) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p></div><div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{icon}</div></div></div>;
}

function BonBadge({ bon }) {
  if (bon.status === "completed") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Compleet</span>;
  if (bon.status === "reserved") return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">{"\ud83d\udcc5"} Gereserveerd</span>;
  if (bonIsOverdue(bon)) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">{"\u26a0\ufe0f"} Te laat</span>;
  const total = bon.items.reduce((s,i)=>s+i.qty,0), ret = bon.items.reduce((s,i)=>s+(i.returned||0),0);
  if (ret > 0) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Deels retour ({ret}/{total})</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Actief</span>;
}

function BonCard({ bon, onClick, showUser }) {
  const rem = bonRemaining(bon); const overdue = bonIsOverdue(bon);
  return <div onClick={onClick} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${overdue&&bon.status!=="completed"?"border-red-200":"border-gray-100 hover:border-gray-200"}`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{bon.number}</span><BonBadge bon={bon}/></div>
        <p className="text-xs text-gray-500 mt-1">{showUser&&<><span className="font-medium">{bon.user}</span> {"\u00b7"} </>}{fmtDate(bon.startDate)} {"\u2192"} {fmtDate(bon.endDate)}{bon.status!=="completed"&&<> {"\u00b7"} {rem.length} open</>}</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
    </div>
  </div>;
}

function AppHeader({ branding, role, onLogout, children, onAdd }) {
  return <div className="bg-white border-b border-gray-100 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {branding.logo ? <img src={branding.logo} className="w-10 h-10 rounded-xl object-cover" alt=""/> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{backgroundColor:branding.color}}>{"\ud83c\udfc5"}</div>}
        <div><h1 className="text-xl font-bold text-gray-900">{branding.title}</h1><p className="text-xs text-gray-500">{role === "admin" ? "Beheerder" : branding.subtitle}</p></div>
      </div>
      <div className="flex items-center gap-2">
        {onAdd && <button onClick={onAdd} className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{backgroundColor:branding.color}}>+ Nieuw</button>}
        <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100">Uitloggen</button>
      </div>
    </div>
    {children}
  </div>;
}

// ============ LOGIN ============
function LoginScreen({ onLogin, branding }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [error, setError] = useState("");
  const go = () => { const f = USERS.find(u=>u.username===user&&u.password===pass); if(f) onLogin(f); else setError("Onjuiste inloggegevens"); };
  return <div className="min-h-screen flex items-center justify-center p-4" style={{background: branding.loginBg ? `url(${branding.loginBg}) center/cover` : `linear-gradient(135deg, ${branding.color}15, #f8fafc, ${branding.color}10)`}}>
    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
      <div className="text-center mb-8">
        {branding.logo ? <img src={branding.logo} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" alt=""/> : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4" style={{backgroundColor:branding.color}}>{"\ud83c\udfc5"}</div>}
        <h1 className="text-2xl font-bold text-gray-900">{branding.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{branding.subtitle}</p>
      </div>
      {error&&<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Gebruikersnaam</label><input className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={user} onChange={e=>{setUser(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={pass} onChange={e=>{setPass(e.target.value);setError("")}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
        <button onClick={go} className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90" style={{backgroundColor:branding.color}}>Inloggen</button>
      </div>
    </div>
  </div>;
}

// ============ ADMIN FORM ============
function AdminForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { name: "", stock: 1, unit: "stuk", category: "Sport sets", location: "Opslag", notes: "", pricePerUnit: 0, maintenance: 0, photo: "" });
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lc = "block text-sm font-medium text-gray-700 mb-1.5";
  return <div className="space-y-4">
    <div className="flex gap-4">
      <ImageUpload value={f.photo} onChange={v=>u("photo",v)} label="Foto"/>
      <div className="flex-1"><label className={lc}>Naam *</label><input className={ic} value={f.name} onChange={e=>u("name",e.target.value)}/></div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div><label className={lc}>Voorraad</label><input type="number" min="1" className={ic} value={f.stock} onChange={e=>u("stock",parseInt(e.target.value)||1)}/></div>
      <div><label className={lc}>Eenheid</label><input className={ic} value={f.unit} onChange={e=>u("unit",e.target.value)}/></div>
      <div><label className={lc}>Categorie</label><select className={ic} value={f.category} onChange={e=>u("category",e.target.value)}>{CATS.filter(c=>c!=="Alle").map(c=><option key={c}>{c}</option>)}</select></div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div><label className={lc}>Prijs/stuk</label><input type="number" step="0.01" min="0" className={ic} value={f.pricePerUnit} onChange={e=>u("pricePerUnit",parseFloat(e.target.value)||0)}/></div>
      <div><label className={lc}>Locatie</label><input className={ic} value={f.location} onChange={e=>u("location",e.target.value)}/></div>
      <div><label className={lc}>Onderhoud</label><input type="number" min="0" max={f.stock} className={ic} value={f.maintenance||0} onChange={e=>u("maintenance",parseInt(e.target.value)||0)}/></div>
    </div>
    <div><label className={lc}>Notities</label><textarea className={ic+" resize-none"} rows={2} value={f.notes} onChange={e=>u("notes",e.target.value)}/></div>
    <div className="flex gap-3 pt-2">
      <button onClick={()=>f.name.trim()&&onSave(f)} disabled={!f.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">{item?"Opslaan":"Toevoegen"}</button>
      <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
    </div>
  </div>;
}

// ============ ADMIN ============
function AdminView({ eq, setEq, bons, setBons, logs, addLog, branding, setBranding, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [addOpen, setAddOpen] = useState(false); const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null); const [bonDetail, setBonDetail] = useState(null);
  const [printItems, setPrintItems] = useState([]);
  const [logFilter, setLogFilter] = useState(""); const [bonFilter, setBonFilter] = useState("active");

  const totalStock = useMemo(()=>eq.reduce((s,e)=>s+e.stock,0),[eq]);
  const totalUnavail = useMemo(()=>eq.reduce((s,e)=>s+unavailableQty(bons,e.id)+(e.maintenance||0),0),[eq,bons]);
  const totalValue = useMemo(()=>eq.reduce((s,e)=>s+(e.pricePerUnit||0)*e.stock,0),[eq]);
  const activeBons = bons.filter(b=>b.status!=="completed");
  const overdueBons = activeBons.filter(bonIsOverdue);
  const reservedBons = bons.filter(b=>b.status==="reserved");
  const filtBons = bonFilter==="active"?bons.filter(b=>b.status==="active"):bonFilter==="reserved"?reservedBons:bonFilter==="overdue"?overdueBons:bonFilter==="completed"?bons.filter(b=>b.status==="completed"):bons;

  const oneYearAgo = useMemo(()=>{const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toISOString();},[]);
  const recentLogs = useMemo(()=>logs.filter(l=>l.date>=oneYearAgo),[logs,oneYearAgo]);
  const filtLogs = logFilter?recentLogs.filter(l=>l.detail.toLowerCase().includes(logFilter.toLowerCase())):recentLogs;
  const filt = eq.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())&&(cat==="Alle"||i.category===cat));

  const add=(i)=>{setEq(p=>[...p,{...i,id:Date.now(),maintenance:i.maintenance||0}]);addLog("edit",`${i.name} toegevoegd`);setAddOpen(false)};
  const save=(i)=>{setEq(p=>p.map(e=>e.id===edit.id?{...e,...i}:e));addLog("edit",`${i.name} bewerkt`);setEdit(null)};
  const del=(id)=>{const it=eq.find(e=>e.id===id);if(!confirm(`"${it?.name}" verwijderen?`))return;setEq(p=>p.filter(e=>e.id!==id));addLog("edit",`${it.name} verwijderd`);setDetail(null)};
  const forceComplete=(bonId)=>{setBons(p=>p.map(b=>b.id===bonId?{...b,status:"completed",completedDate:isoNow(),items:b.items.map(i=>({...i,returned:i.qty}))}:b));const bon=bons.find(b=>b.id===bonId);if(bon)addLog("return",`${bon.number} geforceerd afgerond`);setBonDetail(null)};

  const handlePrint=(items)=>{const w=window.open('','_blank');const svgs=items.map(i=>{const bars=generateBarcode(i.id);const bw=280/bars.length;const rects=bars.split('').map((b,idx)=>b==='1'?`<rect x="${idx*bw}" y="2" width="${bw}" height="80" fill="black"/>`:'').join('');return`<div style="display:inline-block;margin:10px;padding:10px;border:1px solid #ccc;text-align:center"><svg viewBox="0 0 280 110" width="280" height="110">${rects}<text x="140" y="98" text-anchor="middle" font-size="12" font-family="monospace">${String(i.id).padStart(8,'0')}</text><text x="140" y="108" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#666">${i.name}</text></svg></div>`;}).join('');w.document.write(`<html><head><title>Barcodes</title></head><body>${svgs}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`)};

  const getItemStats=(itemId)=>{const year=bons.filter(b=>b.startDate>=oneYearAgo);let count=0;const borrowers={};year.forEach(b=>b.items.forEach(bi=>{if(bi.itemId===itemId){count+=bi.qty;borrowers[b.user]=(borrowers[b.user]||0)+bi.qty}}));return{count,borrowers}};

  const tabs=[["dashboard","Dashboard"],["bons","Bonnen"],["items","Materiaal"],["log","Logboek"],["barcodes","Barcodes"],["settings","Instellingen"]];

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <AppHeader branding={branding} role="admin" onLogout={onLogout} onAdd={()=>setAddOpen(true)}>
      <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab===k?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>{l}{k==="bons"&&activeBons.length>0?` (${activeBons.length})`:""}</button>)}
      </div>
    </AppHeader>

    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* DASHBOARD */}
      {tab==="dashboard"&&<div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Voorraad" value={totalStock} color="text-gray-700" icon={"\ud83d\udce6"}/>
          <Stat label="Beschikbaar" value={totalStock-totalUnavail} color="text-emerald-600" icon={"\u2705"}/>
          <Stat label="Actieve bonnen" value={bons.filter(b=>b.status==="active").length} color="text-amber-600" icon={"\ud83d\udce4"}/>
          <Stat label="Reserveringen" value={reservedBons.length} color="text-purple-600" icon={"\ud83d\udcc5"}/>
          <Stat label="Waarde" value={fmt(totalValue)} color="text-gray-600" icon={"\ud83d\udcb0"}/>
        </div>
        {overdueBons.length>0&&<div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4"><div className="flex items-start gap-3"><span className="text-lg">{"\u26a0\ufe0f"}</span><div><p className="font-semibold text-red-800 text-sm">Verlopen bonnen ({overdueBons.length})</p>{overdueBons.map(b=><p key={b.id} className="text-xs text-red-700 mt-1 cursor-pointer hover:underline" onClick={()=>setBonDetail(b)}><span className="font-mono font-bold">{b.number}</span> {"\u2014"} {b.user} {"\u2014"} {fmtDate(b.endDate)}</p>)}</div></div></div>}
        {activeBons.length>0&&<div><h3 className="text-sm font-bold text-gray-700 mb-3">Actieve bonnen</h3><div className="space-y-2">{activeBons.slice(0,10).map(b=><BonCard key={b.id} bon={b} onClick={()=>setBonDetail(b)} showUser/>)}</div></div>}
        <div><h3 className="text-sm font-bold text-gray-700 mb-3">Recente activiteit</h3>{recentLogs.length===0?<p className="text-sm text-gray-400">Geen activiteit</p>:<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{recentLogs.slice(0,8).map(l=><div key={l.id} className="px-4 py-3 text-sm"><span className="text-xs text-gray-400">{fmtDT(l.date)}</span><p className="text-gray-700 mt-0.5">{l.detail}</p></div>)}</div>}</div>
      </div>}

      {/* BONNEN */}
      {tab==="bons"&&<div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto">{[["active","Actief"],["reserved","Gereserveerd"],["overdue","Te laat"],["completed","Afgerond"],["all","Alle"]].map(([k,l])=><button key={k} onClick={()=>setBonFilter(k)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${bonFilter===k?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{l}</button>)}</div>
        {filtBons.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen bonnen</p></div>:<div className="space-y-2">{filtBons.map(b=><BonCard key={b.id} bon={b} onClick={()=>setBonDetail(b)} showUser/>)}</div>}
      </div>}

      {/* MATERIAAL */}
      {tab==="items"&&<div className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Zoek..." value={q} onChange={e=>setQ(e.target.value)}/></div>
          <div className="flex gap-1.5 overflow-x-auto">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat===c?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
        </div></div>
        <div className="space-y-2">{filt.map(i=>{const av=availQty(i,bons);const lo=loanedQty(bons,i.id);const res=bons.filter(b=>b.status==="reserved").reduce((s,b)=>{let t=0;b.items.forEach(bi=>{if(bi.itemId===i.id)t+=bi.qty});return s+t},0);
          return <div key={i.id} onClick={()=>setDetail(i)} className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {i.photo?<img src={i.photo} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" alt=""/>:<div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{getIcon(i.category)}</div>}
                <div className="min-w-0"><p className="font-semibold text-gray-900 text-sm truncate">{i.name}</p><p className="text-xs text-gray-500 mt-0.5">{i.stock} {i.unit} {"\u00b7"} {i.category}</p></div>
              </div>
              <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{av}</span>
                {lo>0&&<span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{lo} uit</span>}
                {res>0&&<span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{res} res</span>}
              </div>
            </div>
          </div>})}</div>
      </div>}

      {/* LOG */}
      {tab==="log"&&<div className="space-y-4">
        <div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek..." value={logFilter} onChange={e=>setLogFilter(e.target.value)}/></div>
        {filtLogs.length===0?<p className="text-gray-400 text-center py-8 text-sm">Geen regels</p>:<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{filtLogs.slice(0,200).map(l=><div key={l.id} className="px-4 py-3 text-sm"><span className="text-xs text-gray-400">{fmtDT(l.date)}</span><p className="text-gray-700 mt-0.5">{l.detail}</p></div>)}</div>}
      </div>}

      {/* BARCODES */}
      {tab==="barcodes"&&<div className="space-y-4">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Barcodes</h3><div className="flex gap-2">
          <button onClick={()=>setPrintItems(eq)} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200">Alles</button>
          <button onClick={()=>setPrintItems([])} className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-medium hover:bg-gray-200">Niets</button>
          {printItems.length>0&&<button onClick={()=>handlePrint(printItems)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Print ({printItems.length})</button>}
        </div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{eq.map(i=>{const sel=printItems.some(p=>p.id===i.id);return <div key={i.id} onClick={()=>setPrintItems(p=>sel?p.filter(x=>x.id!==i.id):[...p,i])} className={`bg-white rounded-xl p-3 border-2 cursor-pointer ${sel?"border-blue-500 shadow-md":"border-gray-100 hover:border-gray-200"}`}><div className="flex justify-center mb-2"><BarcodeSVG id={i.id} name={i.name} small/></div><p className="text-xs font-medium text-gray-900 text-center truncate">{i.name}</p></div>})}</div>
      </div>}

      {/* SETTINGS */}
      {tab==="settings"&&<div className="space-y-6 max-w-xl">
        <h3 className="text-lg font-bold text-gray-900">Instellingen</h3>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Branding</h4>
          <ImageUpload value={branding.logo} onChange={v=>setBranding(p=>({...p,logo:v}))} label="Logo"/>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.title} onChange={e=>setBranding(p=>({...p,title:e.target.value}))}/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ondertitel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.subtitle} onChange={e=>setBranding(p=>({...p,subtitle:e.target.value}))}/></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kleur</label><div className="flex items-center gap-3"><input type="color" value={branding.color} onChange={e=>setBranding(p=>({...p,color:e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer border-0"/><span className="text-sm text-gray-500">{branding.color}</span></div></div>
          <ImageUpload value={branding.loginBg} onChange={v=>setBranding(p=>({...p,loginBg:v}))} label="Login achtergrond"/>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h4 className="font-semibold text-gray-800">Data</h4>
          <button onClick={()=>{if(confirm("Alles resetten?")){store.set("mhok-eq4",INIT);store.set("mhok-bons4",[]);store.set("mhok-logs4",[]);store.set("mhok-brand4",DEFAULT_BRANDING);window.location.reload()}}} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200 hover:bg-red-100">Reset alle data</button>
        </div>
      </div>}
    </div>

    <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Nieuw materiaal"><AdminForm onSave={add} onCancel={()=>setAddOpen(false)}/></Modal>
    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Bewerken">{edit&&<AdminForm item={edit} onSave={save} onCancel={()=>setEdit(null)}/>}</Modal>

    <Modal open={!!detail} onClose={()=>setDetail(null)} title="Materiaal" wide>
      {detail&&(()=>{const av=availQty(detail,bons);const stats=getItemStats(detail.id);const itemBons=bons.filter(b=>b.status!=="completed"&&b.items.some(bi=>bi.itemId===detail.id));
        return <div className="space-y-4">
          <div className="flex items-center gap-3">
            {detail.photo?<img src={detail.photo} className="w-16 h-16 rounded-xl object-cover" alt=""/>:<div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{getIcon(detail.category)}</div>}
            <div className="flex-1"><h3 className="font-bold text-gray-900">{detail.name}</h3><p className="text-sm text-gray-500">{detail.category} {"\u00b7"} {detail.stock} {detail.unit}</p></div>
            <BarcodeSVG id={detail.id} name={detail.name} small/>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Beschikbaar</span><span className="font-medium text-emerald-600">{av}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Uitgeleend</span><span className="font-medium text-amber-600">{loanedQty(bons,detail.id)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Onderhoud</span><span className="font-medium">{detail.maintenance||0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Prijs</span><span className="font-medium">{fmt(detail.pricePerUnit)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Uitgeleend (jaar)</span><span className="font-medium">{stats.count}x</span></div>
            {Object.keys(stats.borrowers).length>0&&<div><span className="text-gray-500">Door:</span><div className="mt-1 flex flex-wrap gap-1">{Object.entries(stats.borrowers).sort((a,b)=>b[1]-a[1]).map(([n,c])=><span key={n} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{n} ({c}x)</span>)}</div></div>}
          </div>
          {itemBons.length>0&&<div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bonnen met dit item</p>{itemBons.map(b=><BonCard key={b.id} bon={b} onClick={()=>{setDetail(null);setBonDetail(b)}} showUser/>)}</div>}
          <div className="flex gap-2 pt-2">
            <button onClick={()=>{setEdit(detail);setDetail(null)}} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Bewerken</button>
            <button onClick={()=>handlePrint([detail])} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm">{"\ud83d\udda8"}</button>
            <button onClick={()=>del(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm border border-red-200">Verwijder</button>
          </div>
        </div>})()}
    </Modal>

    <Modal open={!!bonDetail} onClose={()=>setBonDetail(null)} title={bonDetail?`Bon ${bonDetail.number}`:""} wide>
      {bonDetail&&<div className="space-y-4">
        <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">{"\ud83d\udc64"} {bonDetail.user}</p><p className="text-sm text-gray-500">{fmtDate(bonDetail.startDate)} {"\u2192"} {fmtDate(bonDetail.endDate)}</p></div><BonBadge bon={bonDetail}/></div>
        <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">{bonDetail.items.map((bi,idx)=>{const rem=bi.qty-(bi.returned||0);return <div key={idx} className="px-4 py-3 flex items-center justify-between"><div><p className="text-sm font-medium">{bi.itemName}</p><p className="text-xs text-gray-500">{bi.qty} {bi.unit}</p></div>{rem>0?<span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{rem} open</span>:<span className="text-xs text-emerald-600">{"\u2705"}</span>}</div>})}</div>
        {bonDetail.status!=="completed"&&<div className="flex gap-2"><button onClick={()=>forceComplete(bonDetail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Forceer compleet</button></div>}
      </div>}
    </Modal>
  </div>;
}

// ============ USER ============
function UserView({ eq, bons, setBons, addLog, branding, onLogout, user }) {
  const [mode, setMode] = useState(null);
  const [cart, setCart] = useState([]); const [endDate, setEndDate] = useState(""); const [startDate, setStartDate] = useState(today());
  const [isReservation, setIsReservation] = useState(false);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("Alle");
  const [returnBon, setReturnBon] = useState(null);
  const [scanInput, setScanInput] = useState(""); const [scanMsg, setScanMsg] = useState(null);
  const [done, setDone] = useState(null);

  const myBons = bons.filter(b=>b.user===user.label&&b.status!=="completed");

  const available = eq.filter(i=>{
    const av = availQty(i,bons);
    return av>0&&i.name.toLowerCase().includes(q.toLowerCase())&&(cat==="Alle"||i.category===cat);
  });

  const addToCart=(item)=>{const av=availQty(item,bons);const inC=cart.find(c=>c.itemId===item.id)?.qty||0;if(inC>=av)return;if(cart.find(c=>c.itemId===item.id))setCart(p=>p.map(c=>c.itemId===item.id?{...c,qty:c.qty+1}:c));else setCart(p=>[...p,{itemId:item.id,itemName:item.name,unit:item.unit,qty:1,returned:0}])};
  const removeFromCart=(id)=>{setCart(p=>{const ex=p.find(c=>c.itemId===id);if(!ex)return p;if(ex.qty<=1)return p.filter(c=>c.itemId!==id);return p.map(c=>c.itemId===id?{...c,qty:c.qty-1}:c)})};

  const submitBon=()=>{
    if(cart.length===0||!endDate)return;
    const status = isReservation ? "reserved" : "active";
    const bon={id:Date.now(),number:genBonNr(),user:user.label,startDate,endDate,items:cart,status,createdAt:isoNow()};
    setBons(p=>[bon,...p]);
    const desc=cart.map(c=>`${c.qty}x ${c.itemName}`).join(", ");
    addLog(isReservation?"reservation":"loan",`${bon.number}: ${desc} ${isReservation?"gereserveerd":"uitgeleend"} door ${user.label} (${fmtDate(startDate)} - ${fmtDate(endDate)})`);
    setDone({action:isReservation?"reservation":"loan",text:`${bon.number} ${isReservation?"gereserveerd":"aangemaakt"}!`});
    setCart([]);setEndDate("");setStartDate(today());setMode(null);setIsReservation(false);
    setTimeout(()=>setDone(null),4000);
  };

  const handleScan=()=>{
    if(!returnBon||!scanInput.trim())return;
    const code=scanInput.trim();const numId=parseInt(code,10);
    let bonItem=returnBon.items.find(bi=>bi.itemId===numId&&(bi.qty-(bi.returned||0))>0);
    if(!bonItem)bonItem=returnBon.items.find(bi=>bi.itemName.toLowerCase().includes(code.toLowerCase())&&(bi.qty-(bi.returned||0))>0);
    if(bonItem){
      const nr=(bonItem.returned||0)+1;
      setBons(p=>p.map(b=>b.id===returnBon.id?{...b,items:b.items.map(i=>i.itemId===bonItem.itemId?{...i,returned:nr}:i)}:b));
      setReturnBon(prev=>({...prev,items:prev.items.map(i=>i.itemId===bonItem.itemId?{...i,returned:nr}:i)}));
      setScanMsg({ok:true,text:`\u2705 ${bonItem.itemName} (${nr}/${bonItem.qty})`});
      addLog("return",`${returnBon.number}: 1x ${bonItem.itemName} retour`);
    } else setScanMsg({ok:false,text:"\u274c Niet gevonden op deze bon"});
    setScanInput("");setTimeout(()=>setScanMsg(null),3000);
  };

  const pickupScan=()=>{
    if(!returnBon||!scanInput.trim())return;
    const code=scanInput.trim();const numId=parseInt(code,10);
    let bonItem=returnBon.items.find(bi=>bi.itemId===numId&&(bi.pickedUp||0)<bi.qty);
    if(!bonItem)bonItem=returnBon.items.find(bi=>bi.itemName.toLowerCase().includes(code.toLowerCase())&&(bi.pickedUp||0)<bi.qty);
    if(bonItem){
      const nr=(bonItem.pickedUp||0)+1;
      setBons(p=>p.map(b=>b.id===returnBon.id?{...b,items:b.items.map(i=>i.itemId===bonItem.itemId?{...i,pickedUp:nr}:i)}:b));
      setReturnBon(prev=>({...prev,items:prev.items.map(i=>i.itemId===bonItem.itemId?{...i,pickedUp:nr}:i)}));
      setScanMsg({ok:true,text:`\u2705 ${bonItem.itemName} opgehaald (${nr}/${bonItem.qty})`});
      addLog("loan",`${returnBon.number}: 1x ${bonItem.itemName} opgehaald`);
    } else setScanMsg({ok:false,text:"\u274c Niet gevonden op deze bon"});
    setScanInput("");setTimeout(()=>setScanMsg(null),3000);
  };

  const finishPickup=()=>{
    setBons(p=>p.map(b=>b.id===returnBon.id?{...b,status:"active"}:b));
    addLog("loan",`${returnBon.number} opgehaald door ${user.label}`);
    setDone({action:"loan",text:`${returnBon.number} is opgehaald!`});
    setReturnBon(null);setMode(null);setTimeout(()=>setDone(null),4000);
  };

  const finishReturn=()=>{
    const bon=returnBon;const isComp=bonComplete(bon);
    if(isComp){setBons(p=>p.map(b=>b.id===bon.id?{...b,status:"completed",completedDate:isoNow()}:b));addLog("return",`${bon.number} volledig retour`);setDone({action:"return",text:`${bon.number} compleet!`})}
    else{const rem=bonRemaining(bon);addLog("return",`${bon.number} deels retour. Open: ${rem.map(i=>`${i.qty-(i.returned||0)}x ${i.itemName}`).join(", ")}`);setDone({action:"partial",text:`${bon.number} deels retour`})}
    setReturnBon(null);setMode(null);setTimeout(()=>setDone(null),4000);
  };

  // HOME
  if(!mode) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col">
    <AppHeader branding={branding} role="user" onLogout={onLogout}>
      <div className="max-w-xl mx-auto px-5 pb-3"><p className="text-sm text-gray-500">Welkom, {user.label}</p></div>
    </AppHeader>
    {done&&<div className="max-w-xl mx-auto mt-4 px-5"><div className={`rounded-2xl px-5 py-4 text-center font-semibold border text-base ${done.action==="loan"?"bg-blue-50 text-blue-800 border-blue-200":done.action==="return"?"bg-emerald-50 text-emerald-800 border-emerald-200":done.action==="reservation"?"bg-purple-50 text-purple-800 border-purple-200":"bg-amber-50 text-amber-800 border-amber-200"}`}>{done.text}</div></div>}
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <button onClick={()=>setMode("loan")} className="w-full py-10 rounded-3xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udce4"}</span><span className="text-xl">Materiaal lenen</span>
        </button>
        <button onClick={()=>{setMode("loan");setIsReservation(true)}} className="w-full py-10 rounded-3xl bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udcc5"}</span><span className="text-xl">Reserveren</span>
        </button>
        <button onClick={()=>setMode("return")} className="w-full py-10 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl transition-all hover:scale-105 active:scale-95">
          <span className="text-4xl block mb-2">{"\ud83d\udce5"}</span><span className="text-xl">Retourneren / Ophalen</span>
        </button>

        {myBons.length>0&&<div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-6">
          <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Actieve bonnen ({myBons.length})</p>
          <div className="space-y-3">{myBons.map(b=><div key={b.id} className={`rounded-xl p-4 border ${bonIsOverdue(b)?"border-red-200 bg-red-50":"border-gray-100 bg-gray-50"}`}>
            <div className="flex items-center justify-between"><span className="font-mono text-sm font-bold text-blue-600">{b.number}</span><BonBadge bon={b}/></div>
            <p className="text-sm text-gray-500 mt-2">{fmtDate(b.startDate)} {"\u2192"} {fmtDate(b.endDate)}</p>
            <p className="text-xs text-gray-400 mt-1">{b.items.map(i=>i.itemName).join(", ")}</p>
          </div>)}</div>
        </div>}
      </div>
    </div>
  </div>;

  // NEW LOAN / RESERVATION — step-based
  const [loanStep, setLoanStep] = useState(1);
  const totalCartQty = cart.reduce((s, c) => s + c.qty, 0);

  if(mode==="loan") return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 pb-32">
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
        <button onClick={()=>{if(loanStep>1)setLoanStep(loanStep-1);else{setMode(null);setCart([]);setEndDate("");setIsReservation(false);setQ("");setCat("Alle");setLoanStep(1)}}} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>{loanStep>1?"Vorige":"Terug"}</button>
        <h2 className="text-lg font-bold text-gray-900">{isReservation?"Reservering":"Nieuwe bon"}</h2>
        <div className="w-16"/>
      </div>
      {/* Step indicator */}
      <div className="max-w-xl mx-auto px-5 pb-3 flex items-center gap-2">
        {[1,2].map(s => <div key={s} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${loanStep>=s?"bg-blue-600 text-white":"bg-gray-200 text-gray-500"}`}>{s}</div>
          <span className={`text-xs font-medium ${loanStep>=s?"text-gray-900":"text-gray-400"}`}>{s===1?"Kies materiaal":"Bevestig"}</span>
          {s<2&&<div className={`flex-1 h-0.5 rounded ${loanStep>s?"bg-blue-600":"bg-gray-200"}`}/>}
        </div>)}
      </div>
    </div>

    {/* STEP 1: Select items */}
    {loanStep===1 && <div className="max-w-xl mx-auto px-5 py-6 space-y-4">
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek materiaal..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATS.map(c => <button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${cat===c?"bg-blue-600 text-white shadow-sm":"bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{c}</button>)}
      </div>

      <div className="space-y-3">
        {available.length===0 ? <div className="bg-white rounded-2xl p-10 text-center border border-gray-100"><p className="text-gray-400">Geen materiaal gevonden</p></div>
        : available.map(i => {
          const av = availQty(i, bons);
          const inC = cart.find(c => c.itemId === i.id)?.qty || 0;
          return <div key={i.id} className={`bg-white rounded-2xl px-5 py-4 border-2 transition-all ${inC > 0 ? "border-blue-400 shadow-md" : "border-gray-100 hover:border-gray-200"}`}>
            <div className="flex items-center gap-4">
              {i.photo ? <img src={i.photo} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt=""/> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">{getIcon(i.category)}</div>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">{i.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{i.category} {"\u00b7"} <span className="text-emerald-600 font-medium">{av} beschikbaar</span></p>
              </div>
              <div className="flex items-center gap-2">
                {inC > 0 && <button onClick={() => removeFromCart(i.id)} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg hover:bg-gray-200 flex items-center justify-center">-</button>}
                {inC > 0 && <span className="text-lg font-bold w-8 text-center text-blue-600">{inC}</span>}
                <button onClick={() => addToCart(i)} disabled={inC >= av} className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 disabled:opacity-30 flex items-center justify-center">+</button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>}

    {/* STEP 2: Confirm */}
    {loanStep===2 && <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg mb-4">{isReservation ? "\ud83d\udcc5 Reservering overzicht" : "\ud83d\uddd2 Bon overzicht"}</h3>
        <div className="space-y-3">
          {cart.map(c => <div key={c.itemId} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">{c.qty}x</span>
              <span className="font-medium text-gray-900">{c.itemName}</span>
            </div>
            <button onClick={() => setCart(p => p.filter(x => x.itemId !== c.itemId))} className="text-red-400 hover:text-red-600 p-1"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 5L5 13M5 5l8 8"/></svg></button>
          </div>)}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-gray-900 text-lg">Datums</h3>
        {isReservation && <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ophaaldatum</label>
          <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} min={today()}/>
        </div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Retourdatum *</label>
          <input type="date" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today()}/>
        </div>
      </div>

      <button onClick={submitBon} disabled={cart.length === 0 || !endDate} className={`w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 shadow-lg ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-amber-500 hover:bg-amber-600"}`}>
        {isReservation ? "\ud83d\udcc5 Reservering bevestigen" : "\ud83d\udce4 Bon aanmaken"} ({totalCartQty} items)
      </button>
    </div>}

    {/* Floating cart bar */}
    {loanStep === 1 && <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div>
          {cart.length > 0 ? <p className="font-semibold text-gray-900">{totalCartQty} item{totalCartQty !== 1 ? "s" : ""} geselecteerd</p> : <p className="text-gray-400">Selecteer materiaal</p>}
          {cart.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{cart.map(c => `${c.qty}x ${c.itemName}`).join(", ")}</p>}
        </div>
        <button onClick={() => setLoanStep(2)} disabled={cart.length === 0} className={`px-6 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-30 shadow-sm ${isReservation ? "bg-purple-500 hover:bg-purple-600" : "bg-blue-600 hover:bg-blue-700"}`}>
          Ga verder {"\u2192"}
        </button>
      </div>
    </div>}
  </div>;

  // RETURN / PICKUP - select bon
  if(mode==="return"&&!returnBon) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={()=>setMode(null)} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Kies een bon</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      {myBons.length===0?<div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udce6"}</p><p className="text-gray-500">Geen actieve bonnen</p></div>
      :myBons.map(b=><div key={b.id} onClick={()=>setReturnBon(b)} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${b.status==="reserved"?"border-purple-200 hover:border-purple-300":"border-gray-100 hover:border-gray-200"}`}>
        <div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{b.number}</span><BonBadge bon={b}/></div><p className="text-xs text-gray-500 mt-1">{b.items.map(i=>i.itemName).join(", ")}</p></div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{backgroundColor:b.status==="reserved"?"#f3e8ff":"#ecfdf5",color:b.status==="reserved"?"#7c3aed":"#059669"}}>{b.status==="reserved"?"Ophalen":"Retour"}</span></div>
      </div>)}
    </div>
  </div>;

  // SCAN - pickup or return
  if(mode==="return"&&returnBon) {
    const isPickup = returnBon.status === "reserved";
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={()=>setReturnBon(null)} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
        <h2 className="text-lg font-bold text-gray-900">{isPickup?"Ophalen":"Retour"} {returnBon.number}</h2><div className="w-16"/>
      </div></div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className={`rounded-2xl p-5 shadow-sm border ${isPickup?"bg-purple-50 border-purple-200":"bg-white border-gray-100"}`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">{isPickup?"Scan materiaal om op te halen":"Scan materiaal om te retourneren"}</label>
          <div className="flex gap-2">
            <input className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Scan of typ code..." value={scanInput} onChange={e=>setScanInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(isPickup?pickupScan():handleScan())} autoFocus/>
            <button onClick={isPickup?pickupScan:handleScan} className={`px-5 py-3 rounded-xl text-white font-semibold text-sm ${isPickup?"bg-purple-500 hover:bg-purple-600":"bg-emerald-500 hover:bg-emerald-600"}`}>{isPickup?"\ud83d\udce4":"\ud83d\udce5"}</button>
          </div>
          {scanMsg&&<div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${scanMsg.ok?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-sm">Items</h3></div>
          {returnBon.items.map((bi,idx)=>{const rem=isPickup?bi.qty-(bi.pickedUp||0):bi.qty-(bi.returned||0);return <div key={idx} className={`px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 ${rem===0?"bg-emerald-50/50":""}`}><div><p className="text-sm font-medium">{bi.itemName}</p><p className="text-xs text-gray-500">{isPickup?`${bi.pickedUp||0}/${bi.qty} opgehaald`:`${bi.returned||0}/${bi.qty} gescand`}</p></div>{rem===0?<span className="text-emerald-600">{"\u2705"}</span>:<span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{rem} open</span>}</div>})}
        </div>
        <button onClick={isPickup?finishPickup:finishReturn} className={`w-full py-3 rounded-xl text-white font-bold text-sm ${isPickup?"bg-purple-500 hover:bg-purple-600":"bg-emerald-500 hover:bg-emerald-600"}`}>
          {isPickup?"Ophalen afronden":(bonComplete(returnBon)?"\u2705 Bon afronden":"\ud83d\udce5 Afronden (deels retour)")}
        </button>
        {!isPickup&&!bonComplete(returnBon)&&<p className="text-xs text-amber-600 text-center">Openstaande items blijven op de bon staan.</p>}
      </div>
    </div>;
  }
  return null;
}

// ============ MAIN ============
export default function App() {
  const [user, setUser] = useState(null);
  const [eq, setEq] = useState([]);
  const [bons, setBons] = useState([]);
  const [logs, setLogs] = useState([]);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [ok, setOk] = useState(false);

  useEffect(()=>{setEq(store.get("mhok-eq4")||INIT);setBons(store.get("mhok-bons4")||[]);setLogs(store.get("mhok-logs4")||[]);setBranding(store.get("mhok-brand4")||DEFAULT_BRANDING);const u=store.get("mhok-user4");if(u)setUser(u);setOk(true)},[]);
  useEffect(()=>{if(ok)store.set("mhok-eq4",eq)},[eq,ok]);
  useEffect(()=>{if(ok)store.set("mhok-bons4",bons)},[bons,ok]);
  useEffect(()=>{if(ok)store.set("mhok-logs4",logs)},[logs,ok]);
  useEffect(()=>{if(ok)store.set("mhok-brand4",branding)},[branding,ok]);

  const addLog=useCallback((action,detail)=>setLogs(p=>[{id:Date.now(),date:isoNow(),action,detail},...p]),[]);
  const handleLogin=(u)=>{setUser(u);store.set("mhok-user4",u)};
  const handleLogout=()=>{setUser(null);store.set("mhok-user4",null)};

  if(!ok)return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laden...</p></div>;
  if(!user)return <LoginScreen onLogin={handleLogin} branding={branding}/>;
  if(user.role==="admin")return <AdminView eq={eq} setEq={setEq} bons={bons} setBons={setBons} logs={logs} addLog={addLog} branding={branding} setBranding={setBranding} onLogout={handleLogout}/>;
  return <UserView eq={eq} bons={bons} setBons={setBons} addLog={addLog} branding={branding} onLogout={handleLogout} user={user}/>;
}
