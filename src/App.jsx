import { useState, useEffect, useMemo, useRef, useCallback } from "react";

const INIT = [
  { id: 1, name: "Medicinbal (16x2kg, 2x1,5kg, 2x1kg)", quantity: 20, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 20.51, priceTotal: 410.2 },
  { id: 2, name: "UniHockey sticks + balletjes (20sticks)", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 120.94, priceTotal: 241.88 },
  { id: 3, name: "Fhuttle", quantity: 23, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.2, priceTotal: 211.6 },
  { id: 4, name: "Stopwatch", quantity: 5, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 13.25, priceTotal: 66.25 },
  { id: 5, name: "Horden hoog", quantity: 9, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 18.09, priceTotal: 162.81 },
  { id: 6, name: "Streethockey sticks incl. puck (11sticks)", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 365.0, priceTotal: 365.0 },
  { id: 7, name: "Pylon klein (rood)", quantity: 12, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 8, name: "Autoband", quantity: 4, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 9, name: "Horden laag", quantity: 18, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 14.22, priceTotal: 255.96 },
  { id: 10, name: "Knotshockey sticks incl. bal (12sticks)", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 131.83, priceTotal: 263.66 },
  { id: 11, name: "Pylon klein (oranje)", quantity: 25, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.71, priceTotal: 317.75 },
  { id: 12, name: "Paaltje met vlag", quantity: 16, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 13, name: "Estafettestokje", quantity: 13, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 2.84, priceTotal: 36.92 },
  { id: 14, name: "Golfset incl. ballen", quantity: 50, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 20.0, priceTotal: 1000.0 },
  { id: 15, name: "pylon groot", quantity: 25, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.4, priceTotal: 310.0 },
  { id: 16, name: "Blauwe prikkers", quantity: 40, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.0, priceTotal: 40.0 },
  { id: 17, name: "Kogel 3 kilo", quantity: 6, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 16.25, priceTotal: 97.5 },
  { id: 18, name: "Freeplayer", quantity: 4, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 2147.75, priceTotal: 8591.0 },
  { id: 19, name: "Markeerpylon (dopjes) (set)", quantity: 8, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 35.7, priceTotal: 285.6 },
  { id: 20, name: "Matjes (ikea)", quantity: 8, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.0, priceTotal: 8.0 },
  { id: 21, name: "Kogel 2 kilo", quantity: 6, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 15.13, priceTotal: 90.78 },
  { id: 22, name: "Korfbal 2x, Basketbal 2x, Multi-net 2x", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1086.58, priceTotal: 1086.58 },
  { id: 23, name: "hoepels kleind", quantity: 12, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 24, name: "Blikgooiset", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 34.85, priceTotal: 34.85 },
  { id: 25, name: "kogel kunststof", quantity: 12, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 26, name: "schietschijf boogschieten", quantity: 13, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 32.99, priceTotal: 428.87 },
  { id: 27, name: "Hoepels", quantity: 25, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 4.17, priceTotal: 104.25 },
  { id: 28, name: "Parachute klein", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 49.61, priceTotal: 49.61 },
  { id: 29, name: "Speer 500gram", quantity: 6, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 65.95, priceTotal: 395.7 },
  { id: 30, name: "Schietschijf boogschieten fun", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 14.99, priceTotal: 44.97 },
  { id: 31, name: "Trapeze stok", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 158.27, priceTotal: 158.27 },
  { id: 32, name: "Parachute groot", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 102.55, priceTotal: 102.55 },
  { id: 33, name: "Speer 400gram", quantity: 6, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 62.01, priceTotal: 372.06 },
  { id: 34, name: "boog boogschieten", quantity: 14, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 27.99, priceTotal: 391.86 },
  { id: 35, name: "Hesjes", quantity: 47, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 4.78, priceTotal: 224.66 },
  { id: 36, name: "Unihockey doeltje", quantity: 4, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 30.0, priceTotal: 120.0 },
  { id: 37, name: "Meetlint", quantity: 7, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 24.01, priceTotal: 168.07 },
  { id: 38, name: "easy boogschieten", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.99, priceTotal: 29.97 },
  { id: 39, name: "Lintje rood", quantity: 27, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.11, priceTotal: 29.97 },
  { id: 40, name: "Stoeprand set", quantity: 7, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 175.45, priceTotal: 1228.15 },
  { id: 41, name: "meetlint stof", quantity: 1, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 42, name: "pijlen boogschieten (20 totaal)", quantity: 10, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.99, priceTotal: 99.9 },
  { id: 43, name: "Lintje marineblauw", quantity: 12, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.11, priceTotal: 13.32 },
  { id: 44, name: "Beweegfishes", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 20.51, priceTotal: 20.51 },
  { id: 45, name: "Krijtbordje", quantity: 11, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 5.0, priceTotal: 55.0 },
  { id: 46, name: "archerytag set (2 doelen, 12 bogen, 30 pijlen, 12 maskers)", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 650.0, priceTotal: 650.0 },
  { id: 47, name: "Lintje donkerblauw", quantity: 10, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.11, priceTotal: 11.1 },
  { id: 48, name: "Ballauncher", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 49, name: "Loopladder", quantity: 1, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 24.81, priceTotal: 24.81 },
  { id: 50, name: "Flagball set", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 49.61, priceTotal: 99.22 },
  { id: 51, name: "Lintje lichtblauw", quantity: 12, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.11, priceTotal: 13.32 },
  { id: 52, name: "zandlopers", quantity: 5, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 24.81, priceTotal: 124.05 },
  { id: 53, name: "Startklapper", quantity: 3, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 54.39, priceTotal: 163.17 },
  { id: 54, name: "Rampshot set", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 116.77, priceTotal: 233.54 },
  { id: 55, name: "Lintje Geel", quantity: 4, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.11, priceTotal: 4.44 },
  { id: 56, name: "knijpfluit", quantity: 4, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.62, priceTotal: 38.48 },
  { id: 57, name: "discus", quantity: 6, category: "Atletiek", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 58, name: "Kanjam (brievenbussen)", quantity: 17, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 42.29, priceTotal: 718.93 },
  { id: 59, name: "Lintje oranje", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.11, priceTotal: 1.11 },
  { id: 60, name: "muziekbox", quantity: 2, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 450.0, priceTotal: 900.0 },
  { id: 61, name: "Spike ball set", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 108.3, priceTotal: 216.6 },
  { id: 62, name: "schijven met cijfers", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 63, name: "gewichten", quantity: 12, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 11.07, priceTotal: 132.84 },
  { id: 64, name: "ultimate frisbeeset", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 65, name: "Ringen", quantity: 20, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 4.54, priceTotal: 90.8 },
  { id: 66, name: "haspel", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 100.0, priceTotal: 100.0 },
  { id: 67, name: "Chinese bordjes", quantity: 6, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 68, name: "Swingball", quantity: 4, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 72.54, priceTotal: 290.16 },
  { id: 69, name: "Slagbal plank", quantity: 4, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 10.41, priceTotal: 41.64 },
  { id: 70, name: "ballenpomp elektrisch", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 200.0, priceTotal: 200.0 },
  { id: 71, name: "stokken chinese bordjes", quantity: 2, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 72, name: "frisbeedoelen", quantity: 4, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 54.15, priceTotal: 216.6 },
  { id: 73, name: "slagbalknuppels", quantity: 4, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 21.72, priceTotal: 86.88 },
  { id: 74, name: "stokpaardjes", quantity: 4, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 35.0, priceTotal: 140.0 },
  { id: 75, name: "Jongleerdoekjes", quantity: 11, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 76, name: "lacrosse set", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 77, name: "slagstatief", quantity: 4, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 37.33, priceTotal: 149.32 },
  { id: 78, name: "watertonnen", quantity: 3, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 90.0, priceTotal: 270.0 },
  { id: 79, name: "Stokje met sierlint", quantity: 5, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 80, name: "honkenset", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 21.48, priceTotal: 42.96 },
  { id: 81, name: "vouwfiets", quantity: 2, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 229.99, priceTotal: 459.98 },
  { id: 82, name: "Pedalo", quantity: 1, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 156.7, priceTotal: 156.7 },
  { id: 83, name: "honkbalhandschoen links", quantity: 17, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 48.34, priceTotal: 821.78 },
  { id: 84, name: "partytent", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 100.0, priceTotal: 100.0 },
  { id: 85, name: "Jongleerballen", quantity: 14, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 86, name: "KUBB spel", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 42.96, priceTotal: 128.88 },
  { id: 87, name: "honkbalhandschoen rechts", quantity: 5, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 48.34, priceTotal: 241.7 },
  { id: 88, name: "EHBOset", quantity: 2, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 60.0, priceTotal: 120.0 },
  { id: 89, name: "Jongleerstokken set van 3", quantity: 1, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 90, name: "skateboards", quantity: 7, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 45.07, priceTotal: 315.49 },
  { id: 91, name: "Frisbee soft klein", quantity: 10, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.04, priceTotal: 120.4 },
  { id: 92, name: "tafelrandverhoger", quantity: 2, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 3.57, priceTotal: 7.14 },
  { id: 93, name: "Jongleerringen", quantity: 5, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 94, name: "pennyboards", quantity: 10, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 44.17, priceTotal: 441.7 },
  { id: 95, name: "Frisbee plastic groot", quantity: 13, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 18.09, priceTotal: 235.17 },
  { id: 96, name: "movecube", quantity: 3, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 30.0, priceTotal: 90.0 },
  { id: 97, name: "Marionette sets", quantity: 3, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 98, name: "Scoop set", quantity: 19, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 6.0, priceTotal: 114.0 },
  { id: 99, name: "fribee kanjam", quantity: 4, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 11.19, priceTotal: 44.76 },
  { id: 100, name: "dobbelsteen", quantity: 4, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.4, priceTotal: 49.6 },
  { id: 101, name: "Diabolo set", quantity: 9, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 16.52, priceTotal: 148.68 },
  { id: 102, name: "Schaakbord", quantity: 44, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 17.0, priceTotal: 748.0 },
  { id: 103, name: "Frisbee prut", quantity: 8, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 16.76, priceTotal: 134.08 },
  { id: 104, name: "schuif jeu de boules", quantity: 2, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 23.6, priceTotal: 47.2 },
  { id: 105, name: "Diabolo stokken", quantity: 2, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 4.48, priceTotal: 8.96 },
  { id: 106, name: "Schaakset", quantity: 44, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 107, name: "Loopklos set", quantity: 7, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 5.99, priceTotal: 41.93 },
  { id: 108, name: "pilonhoezen set", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.5, priceTotal: 9.5 },
  { id: 109, name: "circussetprijs", quantity: 1, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 393.25, priceTotal: 393.25 },
  { id: 110, name: "Croquetspel", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 27.0, priceTotal: 54.0 },
  { id: 111, name: "Steppingstones set", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 60.44, priceTotal: 60.44 },
  { id: 112, name: "schietschijf", quantity: 3, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 14.99, priceTotal: 44.97 },
  { id: 113, name: "Jongeleerset Master", quantity: 1, category: "Circus", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 273.46, priceTotal: 273.46 },
  { id: 114, name: "bowlingset", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 37.69, priceTotal: 75.38 },
  { id: 115, name: "Kruiptunnel", quantity: 7, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 14.99, priceTotal: 104.93 },
  { id: 116, name: "kruisboog", quantity: 3, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.99, priceTotal: 29.97 },
  { id: 117, name: "bowlingset origineel", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 150.0, priceTotal: 300.0 },
  { id: 118, name: "Touwtrektouw", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 82.89, priceTotal: 82.89 },
  { id: 119, name: "smartclips", quantity: 2, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 2395.8, priceTotal: 4791.6 },
  { id: 120, name: "Toverkoord", quantity: 5, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 10.83, priceTotal: 54.15 },
  { id: 121, name: "Fitness band licht", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 32.99, priceTotal: 32.99 },
  { id: 122, name: "Badmintonrackets groot", quantity: 19, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.04, priceTotal: 228.76 },
  { id: 123, name: "Grootspringtouw", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.62, priceTotal: 9.62 },
  { id: 124, name: "Fitness band medium", quantity: 1, category: "Extra", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 39.99, priceTotal: 39.99 },
  { id: 125, name: "Badmintonrackets klein", quantity: 7, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 11.5, priceTotal: 80.5 },
  { id: 126, name: "Basketbal", quantity: 20, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 18.45, priceTotal: 369.0 },
  { id: 127, name: "Springtouw", quantity: 12, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 3.21, priceTotal: 38.52 },
  { id: 128, name: "Tennisrackets groot", quantity: 2, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 24.14, priceTotal: 48.28 },
  { id: 129, name: "Straatvoetbal", quantity: 5, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 18.09, priceTotal: 90.45 },
  { id: 130, name: "Pittenzakje", quantity: 43, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 1.98, priceTotal: 85.14 },
  { id: 131, name: "Tennisrackets klein", quantity: 4, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 21.72, priceTotal: 86.88 },
  { id: 132, name: "freestyle voetbal", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 133, name: "Gymbal", quantity: 5, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 25.95, priceTotal: 129.75 },
  { id: 134, name: "Tennisrackets plastic", quantity: 21, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.04, priceTotal: 252.84 },
  { id: 135, name: "korfbal", quantity: 11, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 30.1, priceTotal: 331.1 },
  { id: 136, name: "Kunststof gymstok", quantity: 10, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 3.57, priceTotal: 35.7 },
  { id: 137, name: "Pingpong batje", quantity: 15, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 7.09, priceTotal: 106.35 },
  { id: 138, name: "Foambal groot", quantity: 14, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 20.51, priceTotal: 287.14 },
  { id: 139, name: "Volwassen bokshandschoen", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 48.34, priceTotal: 96.68 },
  { id: 140, name: "Foambal klein", quantity: 5, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 10.83, priceTotal: 54.15 },
  { id: 141, name: "Kinder bokshandschoenen", quantity: 24, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 31.37, priceTotal: 752.88 },
  { id: 142, name: "gele ballen", quantity: 6, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 143, name: "Stootkussens", quantity: 10, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 59.9, priceTotal: 599.0 },
  { id: 144, name: "oranje ballen", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 145, name: "Vortex", quantity: 16, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 22.93, priceTotal: 366.88 },
  { id: 146, name: "bal ondefinieerbaar", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 147, name: "Tikhesje", quantity: 8, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 21.18, priceTotal: 169.44 },
  { id: 148, name: "spot kleuren set (per stuk)", quantity: 13, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 149, name: "Mikschijven klittenband", quantity: 8, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 27.77, priceTotal: 222.16 },
  { id: 150, name: "lapjesbal", quantity: 2, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 24.14, priceTotal: 48.28 },
  { id: 151, name: "klittenbandhandschoen", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 152, name: "Berebal", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 5.0, priceTotal: 15.0 },
  { id: 153, name: "cornhole set", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 154, name: "Volleybal", quantity: 10, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 30.86, priceTotal: 308.6 },
  { id: 155, name: "draaitol", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 156, name: "roze ballen", quantity: 5, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 22.93, priceTotal: 114.65 },
  { id: 157, name: "ringwerpen set", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 158, name: "rugbyballen", quantity: 5, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 21.72, priceTotal: 108.6 },
  { id: 159, name: "tafelcurling", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 160, name: "blauwe ballen (james bonsspel)", quantity: 11, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 22.93, priceTotal: 252.23 },
  { id: 161, name: "werpspel (stof)", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 162, name: "honkballen groot", quantity: 10, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 5.99, priceTotal: 59.9 },
  { id: 163, name: "netjes", quantity: 2, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 164, name: "totaal", quantity: 1, category: "Racketsport", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 165, name: "honkballen klein", quantity: 16, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 6.17, priceTotal: 98.72 },
  { id: 166, name: "tafel jeu de boules", quantity: 1, category: "Gymmateriaal", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 },
  { id: 167, name: "Tennisballen (60)", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 103.46, priceTotal: 103.46 },
  { id: 168, name: "Softtennisbal", quantity: 12, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 2.66, priceTotal: 31.92 },
  { id: 169, name: "Shuttles (set van 6)", quantity: 5, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 14.46, priceTotal: 72.3 },
  { id: 170, name: "Pingpong balletjes (set van 100)", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 62.32, priceTotal: 62.32 },
  { id: 171, name: "kaatsballen (set van 4)", quantity: 3, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 9.62, priceTotal: 28.86 },
  { id: 172, name: "kleine ballen (set van 12)", quantity: 5, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 12.04, priceTotal: 60.2 }
];

const CATS = ["Alle", "Atletiek", "Circus", "Racketsport", "Sport sets", "Gymmateriaal", "Extra"];
const STS = { available: "Beschikbaar", "in-use": "In gebruik", maintenance: "Onderhoud" };
const STO = ["available", "in-use", "maintenance"];
const getIcon = (c) => ({ Atletiek: "\ud83c\udfc3", Circus: "\ud83c\udfaa", Racketsport: "\ud83c\udff8", "Sport sets": "\u26bd", Gymmateriaal: "\ud83e\udd38", Extra: "\ud83d\udce6" }[c] || "\ud83c\udfc5");
const fmt = (n) => typeof n === "number" && n > 0 ? "\u20ac" + n.toFixed(2).replace(".", ",") : "-";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "";
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const today = () => new Date().toISOString().split("T")[0];
const now = () => new Date().toISOString();

const USERS = [
  { username: "admin", password: "admin123", role: "admin", label: "Beheerder" },
  { username: "gebruiker1", password: "welkom123", role: "user", label: "Gebruiker 1" },
];

const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// Simple barcode SVG generator (Code128-like)
function generateBarcode(id) {
  const str = String(id).padStart(8, '0');
  let bars = "11010010000"; // start
  for (const ch of str) {
    const patterns = ["11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000"];
    bars += patterns[parseInt(ch)] || patterns[0];
  }
  bars += "1100011101011"; // stop
  return bars;
}

function BarcodeSVG({ id, name, small }) {
  const bars = generateBarcode(id);
  const w = small ? 160 : 280;
  const h = small ? 50 : 80;
  const bw = w / bars.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + (small ? 18 : 30)}`} width={w} height={h + (small ? 18 : 30)} className="bg-white">
      {bars.split('').map((b, i) => b === '1' ? <rect key={i} x={i * bw} y={2} width={bw} height={h} fill="black"/> : null)}
      <text x={w/2} y={h + (small ? 12 : 18)} textAnchor="middle" fontSize={small ? 9 : 12} fontFamily="monospace">{String(id).padStart(8, '0')}</text>
      {!small && <text x={w/2} y={h + 28} textAnchor="middle" fontSize={9} fontFamily="sans-serif" fill="#666">{name}</text>}
    </svg>
  );
}

function Badge({ status }) {
  const c = { available: "bg-emerald-100 text-emerald-800 border-emerald-200", "in-use": "bg-amber-100 text-amber-800 border-amber-200", maintenance: "bg-rose-100 text-rose-800 border-rose-200" };
  const d = { available: "bg-emerald-500", "in-use": "bg-amber-500", maintenance: "bg-rose-500" };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${c[status]}`}><span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${d[status]}`}/>{STS[status]}</span>;
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"/>
      <div className={`relative bg-white rounded-2xl shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"} w-full mx-4 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 5L5 15M5 5l10 10"/></svg></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }) {
  return <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p></div><div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">{icon}</div></div></div>;
}

function LogEntry({ log }) {
  const icon = log.action==="loan"?"\ud83d\udce4":log.action==="return"?"\ud83d\udce5":log.action==="maintenance"?"\ud83d\udd27":"\u270f\ufe0f";
  const label = log.action==="loan"?"Uitgeleend":log.action==="return"?"Teruggebracht":log.action==="maintenance"?"Onderhoud":"Bewerkt";
  const color = log.action==="loan"?"text-amber-700 bg-amber-50":log.action==="return"?"text-emerald-700 bg-emerald-50":"text-gray-700 bg-gray-50";
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-xl ${color}`}>
      <span className="text-sm mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold">{label}</span><span className="text-xs opacity-70">{fmtDateTime(log.date)}</span></div>
        <p className="text-xs mt-0.5"><span className="font-medium">{log.item}</span> {"\u2014"} {log.detail}</p>
      </div>
    </div>
  );
}

// ============ LOGIN SCREEN ============
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const handleLogin = () => {
    const found = USERS.find(u => u.username === user && u.password === pass);
    if (found) onLogin(found);
    else setError("Onjuiste gebruikersnaam of wachtwoord");
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl mx-auto mb-4">{"\ud83c\udfc5"}</div>
          <h1 className="text-2xl font-bold text-gray-900">Materiaalhok</h1>
          <p className="text-sm text-gray-500 mt-1">Beweegteam Opsterland</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gebruikersnaam</label>
            <input className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={user} onChange={e => { setUser(e.target.value); setError(""); }} placeholder="Gebruikersnaam" onKeyDown={e => e.key === "Enter" && handleLogin()}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord</label>
            <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={pass} onChange={e => { setPass(e.target.value); setError(""); }} placeholder="Wachtwoord" onKeyDown={e => e.key === "Enter" && handleLogin()}/>
          </div>
          <button onClick={handleLogin} className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm">Inloggen</button>
        </div>
      </div>
    </div>
  );
}

// ============ ADMIN: EDIT FORM ============
function AdminForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { name: "", quantity: 1, category: "Sport sets", status: "available", borrower: "", location: "Opslag", returnDate: "", notes: "", pricePerUnit: 0, priceTotal: 0 });
  const u = (k, v) => { const nf = { ...f, [k]: v }; if (k === "pricePerUnit") nf.priceTotal = parseFloat(v||0)*(nf.quantity||1); if (k === "quantity") nf.priceTotal = (nf.pricePerUnit||0)*parseFloat(v||1); setF(nf); };
  const ic = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const lc = "block text-sm font-medium text-gray-700 mb-1.5";
  return (
    <div className="space-y-4">
      <div><label className={lc}>Naam *</label><input className={ic} value={f.name} onChange={e=>u("name",e.target.value)} placeholder="Bijv. Volleybal"/></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={lc}>Aantal</label><input type="number" min="1" className={ic} value={f.quantity} onChange={e=>u("quantity",parseInt(e.target.value)||1)}/></div>
        <div><label className={lc}>Categorie</label><select className={ic} value={f.category} onChange={e=>u("category",e.target.value)}>{CATS.filter(c=>c!=="Alle").map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className={lc}>Status</label><select className={ic} value={f.status} onChange={e=>u("status",e.target.value)}>{STO.map(s=><option key={s} value={s}>{STS[s]}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lc}>Prijs/stuk ({"\u20ac"})</label><input type="number" step="0.01" min="0" className={ic} value={f.pricePerUnit} onChange={e=>u("pricePerUnit",parseFloat(e.target.value)||0)}/></div>
        <div><label className={lc}>Locatie</label><input className={ic} value={f.location} onChange={e=>u("location",e.target.value)} placeholder="Opslag"/></div>
      </div>
      {f.status==="in-use"&&<div className="grid grid-cols-2 gap-3"><div><label className={lc}>Geleend door</label><input className={ic} value={f.borrower} onChange={e=>u("borrower",e.target.value)}/></div><div><label className={lc}>Retour op</label><input type="date" className={ic} value={f.returnDate} onChange={e=>u("returnDate",e.target.value)}/></div></div>}
      {f.status==="maintenance"&&<div><label className={lc}>Verwacht terug</label><input type="date" className={ic} value={f.returnDate} onChange={e=>u("returnDate",e.target.value)}/></div>}
      <div><label className={lc}>Notities</label><textarea className={ic+" resize-none"} rows={2} value={f.notes} onChange={e=>u("notes",e.target.value)}/></div>
      <div className="flex gap-3 pt-2">
        <button onClick={()=>f.name.trim()&&onSave(f)} disabled={!f.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40">{item?"Opslaan":"Toevoegen"}</button>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50">Annuleren</button>
      </div>
    </div>
  );
}

// ============ ADMIN VIEW ============
function AdminView({ eq, setEq, logs, addLog, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Alle");
  const [sf, setSf] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null);
  const [printItems, setPrintItems] = useState([]);
  const [logFilter, setLogFilter] = useState("");
  const printRef = useRef();

  const st = { t:eq.length, a:eq.filter(e=>e.status==="available").length, u:eq.filter(e=>e.status==="in-use").length, m:eq.filter(e=>e.status==="maintenance").length };
  const totalValue = useMemo(()=>eq.reduce((s,e)=>s+(e.priceTotal||0),0),[eq]);
  const ov = eq.filter(e=>e.returnDate&&new Date(e.returnDate)<new Date()&&e.status!=="available");
  const loaned = eq.filter(e=>e.status==="in-use");
  const maint = eq.filter(e=>e.status==="maintenance");

  const oneYearAgo = useMemo(() => { const d = new Date(); d.setFullYear(d.getFullYear()-1); return d.toISOString(); }, []);
  const recentLogs = useMemo(() => logs.filter(l => l.date >= oneYearAgo), [logs, oneYearAgo]);

  const filt = eq.filter(i => {
    const s = q.toLowerCase();
    return (i.name.toLowerCase().includes(s)||(i.borrower||"").toLowerCase().includes(s)||(i.location||"").toLowerCase().includes(s))
      && (cat==="Alle"||i.category===cat) && (sf==="all"||i.status===sf);
  });

  const filtLogs = logFilter ? recentLogs.filter(l=>l.item.toLowerCase().includes(logFilter.toLowerCase())||l.detail.toLowerCase().includes(logFilter.toLowerCase())) : recentLogs;

  const add = (i) => { const ni={...i,id:Date.now(),priceTotal:(i.pricePerUnit||0)*(i.quantity||1)}; setEq(p=>[...p,ni]); addLog("edit",i.name,"Toegevoegd door beheerder"); setAddOpen(false); };
  const save = (i) => { setEq(p=>p.map(e=>e.id===edit.id?{...i,id:edit.id,priceTotal:(i.pricePerUnit||0)*(i.quantity||1)}:e)); addLog("edit",i.name,"Bewerkt door beheerder"); setEdit(null); };
  const del = (id) => { const it=eq.find(e=>e.id===id); if(!confirm(`"${it?.name}" verwijderen?`)) return; setEq(p=>p.filter(e=>e.id!==id)); if(it) addLog("edit",it.name,"Verwijderd door beheerder"); setDetail(null); };
  const forceReturn = (id) => { const it=eq.find(e=>e.id===id); setEq(p=>p.map(e=>e.id===id?{...e,status:"available",borrower:"",returnDate:""}:e)); if(it) addLog("return",it.name,`Geforceerd retour door beheerder (was bij: ${it.borrower||"onbekend"})`); setDetail(null); };
  const setMaintenance = (id) => { const it=eq.find(e=>e.id===id); setEq(p=>p.map(e=>e.id===id?{...e,status:"maintenance",borrower:"",returnDate:""}:e)); if(it) addLog("maintenance",it.name,"In onderhoud gezet door beheerder"); setDetail(null); };

  const handlePrint = (items) => {
    const printWindow = window.open('', '_blank');
    const svgs = items.map(i => {
      const bars = generateBarcode(i.id);
      const w = 280, h = 80, bw = w / bars.length;
      const rects = bars.split('').map((b, idx) => b === '1' ? `<rect x="${idx*bw}" y="2" width="${bw}" height="${h}" fill="black"/>` : '').join('');
      return `<div style="display:inline-block;margin:10px;padding:10px;border:1px solid #ccc;text-align:center">
        <svg viewBox="0 0 ${w} 110" width="${w}" height="110" style="background:white">${rects}
        <text x="${w/2}" y="${h+18}" text-anchor="middle" font-size="12" font-family="monospace">${String(i.id).padStart(8,'0')}</text>
        <text x="${w/2}" y="${h+30}" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#666">${i.name}</text></svg>
        <div style="font-size:11px;margin-top:4px;color:#666">${i.quantity}x | ${i.category}</div>
      </div>`;
    }).join('');
    printWindow.document.write(`<html><head><title>Barcodes - Materiaalhok</title></head><body style="font-family:sans-serif">${svgs}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  };

  const getItemLoanStats = (itemName) => {
    const itemLogs = recentLogs.filter(l => l.item === itemName && l.action === "loan");
    const borrowers = {};
    itemLogs.forEach(l => { const m = l.detail.match(/aan (.+?)(\s*\(|$)/); if (m) borrowers[m[1]] = (borrowers[m[1]]||0)+1; });
    return { count: itemLogs.length, borrowers };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg">{"\ud83c\udfc5"}</div>
            <div><h1 className="text-xl font-bold text-gray-900">Materiaalhok</h1><p className="text-xs text-gray-500">Beheerder</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setAddOpen(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">+ Nieuw item</button>
            <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100">Uitloggen</button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {[["dashboard","Dashboard"],["items","Materiaal"],["loaned","Uitgeleend"],["log","Logboek"],["barcodes","Barcodes"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab===k?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* DASHBOARD */}
        {tab==="dashboard"&&<div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Totaal" value={st.t} color="text-gray-700" icon={"\ud83d\udce6"}/>
            <Stat label="Beschikbaar" value={st.a} color="text-emerald-600" icon={"\u2705"}/>
            <Stat label="Uitgeleend" value={st.u} color="text-amber-600" icon={"\ud83d\udce4"}/>
            <Stat label="Onderhoud" value={st.m} color="text-rose-500" icon={"\ud83d\udd27"}/>
            <Stat label="Waarde" value={fmt(totalValue)} color="text-blue-600" icon={"\ud83d\udcb0"}/>
          </div>

          {ov.length>0&&<div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4"><div className="flex items-start gap-3"><span className="text-lg">{"\u26a0\ufe0f"}</span><div><p className="font-semibold text-red-800 text-sm">Te laat ({ov.length})</p>{ov.map(i=><p key={i.id} className="text-xs text-red-700 mt-1"><span className="font-medium">{i.name}</span> {"\u2014"} {i.borrower} (verwacht: {fmtDate(i.returnDate)})</p>)}</div></div></div>}

          {loaned.length>0&&<div><h3 className="text-sm font-bold text-gray-700 mb-3">Momenteel uitgeleend ({loaned.length})</h3><div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{loaned.map(i=>(
            <div key={i.id} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={()=>setDetail(i)}>
              <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{i.name}</p><p className="text-xs text-gray-500">{"\ud83d\udc64"} {i.borrower}{i.returnDate&&` \u00b7 retour ${fmtDate(i.returnDate)}`}</p></div>
              <div className="flex items-center gap-2">{i.returnDate&&new Date(i.returnDate)<new Date()&&<span className="text-xs text-red-600 font-medium">Te laat</span>}<button onClick={e=>{e.stopPropagation();forceReturn(i.id)}} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 hover:bg-emerald-100">Retour</button></div>
            </div>))}</div></div>}

          {maint.length>0&&<div><h3 className="text-sm font-bold text-gray-700 mb-3">In onderhoud ({maint.length})</h3><div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{maint.map(i=>(
            <div key={i.id} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={()=>setDetail(i)}>
              <div><p className="text-sm font-medium text-gray-900">{i.name}</p><p className="text-xs text-gray-500">{i.notes||"Geen notities"}{i.returnDate&&` \u00b7 verwacht ${fmtDate(i.returnDate)}`}</p></div>
              <button onClick={e=>{e.stopPropagation();forceReturn(i.id)}} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200 hover:bg-blue-100">Klaar</button>
            </div>))}</div></div>}

          <div><h3 className="text-sm font-bold text-gray-700 mb-3">Recente activiteit</h3>
            {recentLogs.length===0?<p className="text-sm text-gray-400">Nog geen activiteit</p>
            :<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{recentLogs.slice(0,8).map(l=><div key={l.id} className="px-4 py-3"><LogEntry log={l}/></div>)}</div>}
          </div>
        </div>}

        {/* MATERIAAL LIJST */}
        {tab==="items"&&<div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Zoek..." value={q} onChange={e=>setQ(e.target.value)}/>
              </div>
              <div className="flex gap-1.5 overflow-x-auto">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat===c?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
              <div className="flex gap-1.5">{[["all","Alle"],...Object.entries(STS)].map(([k,l])=><button key={k} onClick={()=>setSf(k)} className={`px-2.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${sf===k?"bg-gray-800 text-white":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{l}</button>)}</div>
            </div>
          </div>
          <div className="space-y-2">{filt.map(i=>(
            <div key={i.id} onClick={()=>setDetail(i)} className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{getIcon(i.category)}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{i.quantity>1?`${i.quantity}x `:""}{i.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{i.category}{i.pricePerUnit>0&&` \u00b7 ${fmt(i.pricePerUnit)}/st`}{i.borrower&&` \u00b7 \ud83d\udc64 ${i.borrower}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2"><Badge status={i.status}/></div>
              </div>
            </div>))}</div>
          <p className="text-center text-xs text-gray-400">{filt.length} van {eq.length}</p>
        </div>}

        {/* UITGELEEND OVERZICHT */}
        {tab==="loaned"&&<div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Uitgeleend materiaal</h3>
          {loaned.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen materiaal is momenteel uitgeleend</p></div>
          :<div className="space-y-2">{loaned.map(i=>{const late=i.returnDate&&new Date(i.returnDate)<new Date();return(
            <div key={i.id} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${late?"border-red-200":"border-gray-100"}`} onClick={()=>setDetail(i)}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{i.name}{late&&<span className="ml-2 text-xs text-red-600">Te laat!</span>}</p>
                  <p className="text-xs text-gray-500 mt-1">{"\ud83d\udc64"} {i.borrower}{i.returnDate&&` \u00b7 ${"\ud83d\udcc5"} retour ${fmtDate(i.returnDate)}`}</p>
                </div>
                <button onClick={e=>{e.stopPropagation();forceReturn(i.id)}} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 hover:bg-emerald-100">Retour</button>
              </div>
            </div>);})}</div>}
        </div>}

        {/* LOGBOEK */}
        {tab==="log"&&<div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-gray-900">Logboek (afgelopen jaar)</h3></div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek in logboek..." value={logFilter} onChange={e=>setLogFilter(e.target.value)}/>
          </div>
          {filtLogs.length===0?<div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100"><p className="text-gray-500 text-sm">Geen logboekregels gevonden</p></div>
          :<div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">{filtLogs.slice(0,200).map(l=><div key={l.id} className="px-4 py-3"><LogEntry log={l}/></div>)}</div>}
        </div>}

        {/* BARCODES */}
        {tab==="barcodes"&&<div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Barcodes genereren</h3>
            {printItems.length>0&&<button onClick={()=>handlePrint(printItems)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">{"\ud83d\udda8"} Print selectie ({printItems.length})</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setPrintItems(eq)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">Selecteer alles</button>
            <button onClick={()=>setPrintItems([])} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">Deselecteer alles</button>
            <button onClick={()=>handlePrint(eq)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">{"\ud83d\udda8"} Print alles</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {eq.map(i=>{const sel=printItems.some(p=>p.id===i.id);return(
              <div key={i.id} onClick={()=>setPrintItems(p=>sel?p.filter(x=>x.id!==i.id):[...p,i])} className={`bg-white rounded-xl p-3 border-2 cursor-pointer transition-all ${sel?"border-blue-500 shadow-md":"border-gray-100 hover:border-gray-200"}`}>
                <div className="flex justify-center mb-2"><BarcodeSVG id={i.id} name={i.name} small/></div>
                <p className="text-xs font-medium text-gray-900 text-center truncate">{i.name}</p>
                <p className="text-xs text-gray-500 text-center">{i.category}</p>
              </div>
            );})}
          </div>
        </div>}
      </div>

      {/* ADD/EDIT MODALS */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Nieuw materiaal"><AdminForm onSave={add} onCancel={()=>setAddOpen(false)}/></Modal>
      <Modal open={!!edit} onClose={()=>setEdit(null)} title="Bewerken">{edit&&<AdminForm item={edit} onSave={save} onCancel={()=>setEdit(null)}/>}</Modal>

      {/* DETAIL MODAL */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="Details" wide>
        {detail&&(()=>{
          const stats = getItemLoanStats(detail.name);
          const itemLogs = recentLogs.filter(l=>l.item===detail.name);
          return <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{getIcon(detail.category)}</div>
              <div className="flex-1"><h3 className="font-bold text-gray-900">{detail.quantity>1?`${detail.quantity}x `:""}{detail.name}</h3><p className="text-sm text-gray-500">{detail.category}</p></div>
              <BarcodeSVG id={detail.id} name={detail.name} small/>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><Badge status={detail.status}/></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Locatie</span><span className="font-medium">{detail.location}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Prijs/stuk</span><span className="font-medium">{fmt(detail.pricePerUnit)}</span></div>
              {detail.priceTotal>0&&<div className="flex justify-between text-sm"><span className="text-gray-500">Totale waarde</span><span className="font-medium">{fmt(detail.priceTotal)}</span></div>}
              {detail.borrower&&<div className="flex justify-between text-sm"><span className="text-gray-500">Geleend door</span><span className="font-medium">{detail.borrower}</span></div>}
              {detail.returnDate&&detail.status!=="available"&&<div className="flex justify-between text-sm"><span className="text-gray-500">Retour</span><span className={`font-medium ${new Date(detail.returnDate)<new Date()?"text-red-600":""}`}>{fmtDate(detail.returnDate)}</span></div>}
              {detail.notes&&<div className="flex justify-between text-sm"><span className="text-gray-500">Notities</span><span className="font-medium text-right max-w-xs">{detail.notes}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-gray-500">Uitgeleend (afg. jaar)</span><span className="font-medium">{stats.count}x</span></div>
              {Object.keys(stats.borrowers).length>0&&<div className="text-sm"><span className="text-gray-500">Door:</span><div className="mt-1 flex flex-wrap gap-1">{Object.entries(stats.borrowers).sort((a,b)=>b[1]-a[1]).map(([name,count])=><span key={name} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{name} ({count}x)</span>)}</div></div>}
            </div>
            {itemLogs.length>0&&<div><p className="text-xs font-semibold text-gray-500 uppercase mb-2">Geschiedenis (afgelopen jaar)</p><div className="space-y-1.5 max-h-48 overflow-y-auto">{itemLogs.slice(0,20).map(l=><LogEntry key={l.id} log={l}/>)}</div></div>}
            <div className="flex gap-2 pt-2">
              {detail.status==="in-use"&&<button onClick={()=>forceReturn(detail.id)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Retour</button>}
              {detail.status==="available"&&<button onClick={()=>setMaintenance(detail.id)} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600">Onderhoud</button>}
              <button onClick={()=>{setEdit(detail);setDetail(null)}} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">Bewerken</button>
              <button onClick={()=>handlePrint([detail])} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200">{"\ud83d\udda8"}</button>
              <button onClick={()=>del(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 border border-red-200">Verwijder</button>
            </div>
          </div>;
        })()}
      </Modal>
    </div>
  );
}

// ============ USER VIEW ============
function UserView({ eq, setEq, logs, addLog, onLogout, user }) {
  const [mode, setMode] = useState(null); // null, "loan", "return"
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Alle");
  const [loanItem, setLoanItem] = useState(null);
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(null);

  const available = eq.filter(i => i.status === "available").filter(i => {
    const s = q.toLowerCase();
    return (i.name.toLowerCase().includes(s)) && (cat === "Alle" || i.category === cat);
  });
  const borrowed = eq.filter(i => i.status === "in-use" && i.borrower === user.label);

  const doLoan = (item) => {
    setEq(p => p.map(e => e.id === item.id ? { ...e, status: "in-use", borrower: user.label, returnDate, notes: notes || e.notes } : e));
    addLog("loan", item.name, `Uitgeleend aan ${user.label}${returnDate ? " (retour " + fmtDate(returnDate) + ")" : ""}`);
    setDone({ action: "loan", item: item.name });
    setLoanItem(null); setReturnDate(""); setNotes("");
    setTimeout(() => setDone(null), 3000);
  };

  const doReturn = (id) => {
    const item = eq.find(e => e.id === id);
    setEq(p => p.map(e => e.id === id ? { ...e, status: "available", borrower: "", returnDate: "" } : e));
    if (item) addLog("return", item.name, `Teruggebracht door ${user.label}`);
    setDone({ action: "return", item: item?.name });
    setTimeout(() => setDone(null), 3000);
  };

  if (!mode) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg">{"\ud83c\udfc5"}</div>
            <div><h1 className="text-lg font-bold text-gray-900">Materiaalhok</h1><p className="text-xs text-gray-500">Welkom, {user.label}</p></div>
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100">Uitloggen</button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <button onClick={() => setMode("loan")} className="w-full py-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95">
            <span className="text-3xl block mb-2">{"\ud83d\udce4"}</span>Materiaal lenen
          </button>
          <button onClick={() => setMode("return")} className="w-full py-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95">
            <span className="text-3xl block mb-2">{"\ud83d\udce5"}</span>Materiaal terugbrengen
          </button>
          {borrowed.length>0&&<div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Jij hebt nu ({borrowed.length})</p>
            {borrowed.map(i=><p key={i.id} className="text-sm text-gray-700 py-1">{getIcon(i.category)} {i.name}{i.returnDate&&<span className="text-xs text-gray-400 ml-2">retour {fmtDate(i.returnDate)}</span>}</p>)}
          </div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => { setMode(null); setQ(""); setCat("Alle"); }} className="flex items-center gap-2 text-blue-600 text-sm font-medium">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg> Terug
          </button>
          <h2 className="text-lg font-bold text-gray-900">{mode==="loan"?"Materiaal lenen":"Materiaal terugbrengen"}</h2>
          <div className="w-16"/>
        </div>
      </div>

      {done&&<div className={`max-w-lg mx-auto mt-4 px-4`}><div className={`rounded-2xl px-5 py-4 text-center font-semibold ${done.action==="loan"?"bg-amber-50 text-amber-800 border border-amber-200":"bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>{done.action==="loan"?"\ud83d\udce4":"\ud83d\udce5"} {done.item} {done.action==="loan"?"is geleend!":"is teruggebracht!"}</div></div>}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {mode==="loan"&&<>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Zoek materiaal..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">{CATS.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${cat===c?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{c}</button>)}</div>
          <div className="space-y-2">
            {available.length===0?<p className="text-center text-gray-400 py-8 text-sm">Geen beschikbaar materiaal gevonden</p>
            :available.map(i=>(
              <div key={i.id} onClick={()=>setLoanItem(i)} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">{getIcon(i.category)}</div>
                  <div><p className="font-semibold text-gray-900 text-sm">{i.quantity>1?`${i.quantity}x `:""}{i.name}</p><p className="text-xs text-gray-500">{i.category}</p></div>
                </div>
              </div>
            ))}
          </div>
        </>}

        {mode==="return"&&<>
          {borrowed.length===0?<div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udce6"}</p><p className="text-gray-500">Je hebt momenteel geen materiaal in bezit</p></div>
          :<div className="space-y-2">{borrowed.map(i=>(
            <div key={i.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">{getIcon(i.category)}</div>
                  <div><p className="font-semibold text-gray-900 text-sm">{i.name}</p><p className="text-xs text-gray-500">{i.returnDate&&`retour ${fmtDate(i.returnDate)}`}</p></div>
                </div>
                <button onClick={()=>doReturn(i.id)} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 shadow-sm">Retour</button>
              </div>
            </div>))}</div>}
        </>}
      </div>

      <Modal open={!!loanItem} onClose={()=>setLoanItem(null)} title="Bevestig uitlening">
        {loanItem&&<div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">{getIcon(loanItem.category)}</div>
            <div><h3 className="font-bold text-gray-900">{loanItem.name}</h3><p className="text-sm text-gray-500">{loanItem.category}</p></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Wanneer breng je het terug?</label>
            <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={returnDate} onChange={e=>setReturnDate(e.target.value)}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notitie (optioneel)</label>
            <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Bijv. voor training donderdag"/>
          </div>
          <button onClick={()=>doLoan(loanItem)} className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600">{"\ud83d\udce4"} Bevestig lening</button>
        </div>}
      </Modal>
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [user, setUser] = useState(null);
  const [eq, setEq] = useState([]);
  const [logs, setLogs] = useState([]);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setEq(store.get("mhok-eq") || INIT);
    setLogs(store.get("mhok-logs") || []);
    const savedUser = store.get("mhok-user");
    if (savedUser) setUser(savedUser);
    setOk(true);
  }, []);

  useEffect(() => { if (ok) store.set("mhok-eq", eq); }, [eq, ok]);
  useEffect(() => { if (ok) store.set("mhok-logs", logs); }, [logs, ok]);

  const addLog = useCallback((action, itemName, detail) => {
    setLogs(p => [{ id: Date.now(), date: now(), action, item: itemName, detail }, ...p]);
  }, []);

  const handleLogin = (u) => { setUser(u); store.set("mhok-user", u); };
  const handleLogout = () => { setUser(null); store.set("mhok-user", null); };

  if (!ok) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laden...</p></div>;
  if (!user) return <LoginScreen onLogin={handleLogin}/>;
  if (user.role === "admin") return <AdminView eq={eq} setEq={setEq} logs={logs} addLog={addLog} onLogout={handleLogout}/>;
  return <UserView eq={eq} setEq={setEq} logs={logs} addLog={addLog} onLogout={handleLogout} user={user}/>;
}
