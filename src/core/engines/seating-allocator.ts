import { StudentRecord } from "../domain/roster";
import {
  AssignedSeat,
  RoomGridProps,
  AllocatedRoom,
} from "../domain/seating-matrix";

export class RoomGrid {
  public id: string;
  public name: string;
  public rows: number;
  public columns: number;
  public studentsPerDesk: number;
  public aisles: Set<number>;
  public reservedSeatIds: Set<string>;

  constructor(props: RoomGridProps) {
    this.id = props.id;
    this.name = props.name;
    this.rows = props.rows;
    this.columns = props.columns;
    this.studentsPerDesk = props.studentsPerDesk;
    this.aisles = new Set(props.aisles || []);
    this.reservedSeatIds = new Set(props.reservedSeatIds || []);
  }

  public getTotalCapacity(): number {
    const activeDesks = this.rows * (this.columns - this.aisles.size);
    const rawTotal = Math.max(0, activeDesks * this.studentsPerDesk);
    return Math.max(0, rawTotal - this.reservedSeatIds.size);
  }

  public generateEmptySeats(): AssignedSeat[] {
    const seats: AssignedSeat[] = [];
    const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let r = 0; r < this.rows; r++) {
      const rowLabel = r < rowLetters.length ? rowLetters[r] : `R${r + 1}`;
      for (let c = 0; c < this.columns; c++) {
        const isAisle = this.aisles.has(c);
        if (isAisle) {
          seats.push({
            id: `${this.id}-${r}-${c}-aisle`,
            position: {
              rowIndex: r,
              colIndex: c,
              seatInDeskIndex: 0,
              label: "AISLE",
            },
            isAisle: true,
          });
        } else {
          for (let s = 0; s < this.studentsPerDesk; s++) {
            const seatSuffix = this.studentsPerDesk > 1 ? `-${s + 1}` : "";
            const label = `${rowLabel}${c + 1}${seatSuffix}`;
            const seatId = `${this.id}-${r}-${c}-${s}`;
            const isReserved = this.reservedSeatIds.has(seatId);
            seats.push({
              id: seatId,
              position: {
                rowIndex: r,
                colIndex: c,
                seatInDeskIndex: s,
                label,
              },
              isAisle: false,
              isReserved,
              reservedReason: isReserved ? "Reserved / Broken Desk" : undefined,
            });
          }
        }
      }
    }
    return seats;
  }
}

export class SeatingAllocatorEngine {
  /**
   * Sequential Allocation: Allocates students strictly in roster order (e.g. by roll number).
   */
  public static allocateSequential(
    students: StudentRecord[],
    rooms: RoomGrid[]
  ): AllocatedRoom[] {
    let studentIndex = 0;
    const result: AllocatedRoom[] = [];

    for (const room of rooms) {
      const seats = room.generateEmptySeats();
      let assignedCount = 0;

      for (const seat of seats) {
        if (!seat.isAisle && !seat.isReserved && studentIndex < students.length) {
          seat.student = {
            ...students[studentIndex],
            assignedRoom: room.name,
            assignedRow: String(seat.position.rowIndex + 1),
            assignedSeat: seat.position.label,
          };
          studentIndex++;
          assignedCount++;
        }
      }

      result.push({
        roomId: room.id,
        roomName: room.name,
        seats,
        totalAssigned: assignedCount,
        totalCapacity: room.getTotalCapacity(),
      });
    }

    return result;
  }

  /**
   * Team-Clustered Allocation:
   * Groups students by team name so teammates sit together at the same bench / adjacent desks.
   */
  public static allocateTeamClustered(
    students: StudentRecord[],
    rooms: RoomGrid[]
  ): AllocatedRoom[] {
    const teamBuckets: Record<string, StudentRecord[]> = {};
    for (const s of students) {
      const team = s.teamName || (s as any).team || "Individual";
      if (!teamBuckets[team]) teamBuckets[team] = [];
      teamBuckets[team].push(s);
    }

    const clusteredStream: StudentRecord[] = [];
    for (const team in teamBuckets) {
      clusteredStream.push(...teamBuckets[team]);
    }

    return this.allocateSequential(clusteredStream, rooms);
  }

  /**
   * Anti-Cheating Interleaved Allocation:
   * Groups students by department, then round-robins them into adjacent desks
   * so no two students of the same department sit next to each other.
   */
  public static allocateInterleaved(
    students: StudentRecord[],
    rooms: RoomGrid[]
  ): AllocatedRoom[] {
    // 1. Group students by department
    const deptBuckets: Record<string, StudentRecord[]> = {};
    for (const s of students) {
      const dept = (s.department || "GENERAL").toUpperCase();
      if (!deptBuckets[dept]) deptBuckets[dept] = [];
      deptBuckets[dept].push(s);
    }

    const deptKeys = Object.keys(deptBuckets);

    // 2. Interleave into a single balanced stream
    const interleavedStream: StudentRecord[] = [];
    let hasMore = true;
    let round = 0;

    while (hasMore) {
      hasMore = false;
      for (const dept of deptKeys) {
        const bucket = deptBuckets[dept];
        if (round < bucket.length) {
          interleavedStream.push(bucket[round]);
          hasMore = true;
        }
      }
      round++;
    }

    // 3. Allocate the interleaved stream to rooms
    return this.allocateSequential(interleavedStream, rooms);
  }

  /**
   * Randomized Allocation: Shuffles students randomly for club elections or hackathons.
   */
  public static allocateRandom(
    students: StudentRecord[],
    rooms: RoomGrid[]
  ): AllocatedRoom[] {
    const shuffled = [...students];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return this.allocateSequential(shuffled, rooms);
  }

  /**
   * Generates clean, high-contrast printable HTML for Master Door Entrance Notice Posters.
   */
  public static generateDoorNoticeHtml(
    room: AllocatedRoom,
    eventName: string = "University Examination & Event"
  ): string {
    const occupiedSeats = room.seats.filter((s) => !s.isAisle && s.student);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Door Notice - ${room.roomName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
    .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 18px; }
    .title { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; }
    .room { font-size: 32px; font-weight: 900; color: #1e3a8a; margin: 6px 0; }
    .meta { font-size: 14px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    th, td { border: 1px solid #666; padding: 6px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; }
    .seat-badge { font-weight: 900; font-family: monospace; color: #1e3a8a; font-size: 14px; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${eventName}</div>
    <div class="room">ROOM: ${room.roomName}</div>
    <div class="meta">Seating Capacity: ${room.totalCapacity} | Assigned Examinees: ${room.totalAssigned}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Seat No</th>
        <th style="width: 25%;">Student ID</th>
        <th style="width: 40%;">Examinee / Student Name</th>
        <th style="width: 20%;">Department</th>
      </tr>
    </thead>
    <tbody>
      ${occupiedSeats
        .map(
          (s) => `
        <tr>
          <td class="seat-badge">${s.position.label}</td>
          <td><b>${s.student?.id || "-"}</b></td>
          <td>${s.student?.name || "-"}</td>
          <td>${s.student?.department || "-"}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generates printable A4 sheets of cut-out Desk Chits / Seat Slips (8 chits per page).
   */
  public static generateDeskChitsHtml(
    room: AllocatedRoom,
    eventName: string = "University Event"
  ): string {
    const occupiedSeats = room.seats.filter((s) => !s.isAisle && s.student);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Desk Chits - ${room.roomName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .chit { border: 2px dashed #475569; border-radius: 8px; padding: 14px; box-sizing: border-box; page-break-inside: avoid; }
    .event { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; }
    .seat { font-size: 26px; font-weight: 900; color: #1e3a8a; margin: 4px 0; font-family: monospace; }
    .name { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 4px; }
    .details { font-size: 12px; color: #334155; margin-top: 2px; }
    .room-badge { display: inline-block; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="grid">
    ${occupiedSeats
      .map(
        (s) => `
      <div class="chit">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="event">${eventName}</div>
            <div class="seat">${s.position.label}</div>
          </div>
          <div class="room-badge">${room.roomName}</div>
        </div>
        <div class="name">${s.student?.name || "Attendee"}</div>
        <div class="details">ID: <b>${s.student?.id || "-"}</b> | Dept: ${s.student?.department || "-"}</div>
      </div>
    `
      )
      .join("")}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generates clean, high-contrast printable HTML for Official Invigilator Room Attendance & Signature Sheets.
   */
  public static generateAttendanceSheetHtml(
    room: AllocatedRoom,
    eventName: string = "University Examination & Contest",
    supervisorName?: string
  ): string {
    const occupiedSeats = room.seats.filter((s) => !s.isAisle && s.student);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Attendance Roster - ${room.roomName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
    .header { border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
    .meta-box { text-align: right; font-size: 12px; color: #334155; }
    .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; }
    .seat-badge { font-weight: 800; font-family: monospace; color: #1e3a8a; font-size: 12px; }
    .check-box { width: 16px; height: 16px; border: 1px solid #475569; display: inline-block; }
    .sig-line { border-bottom: 1px dotted #64748b; width: 100px; height: 14px; display: inline-block; }
    .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${eventName}</div>
      <div class="subtitle">Official Invigilator / Room Supervisor Attendance Roster</div>
    </div>
    <div class="meta-box">
      <div>ROOM: <span class="badge">${room.roomName}</span></div>
      <div style="margin-top: 4px;">Total Examinees: <b>${room.totalAssigned}</b> / ${room.totalCapacity}</div>
      ${supervisorName ? `<div style="margin-top: 2px;">Invigilator: <b>${supervisorName}</b></div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 8%;">Seat</th>
        <th style="width: 14%;">Student ID</th>
        <th style="width: 24%;">Student Name</th>
        <th style="width: 14%;">Department</th>
        <th style="width: 14%;">Team</th>
        <th style="width: 8%; text-align: center;">Present</th>
        <th style="width: 8%; text-align: center;">Absent</th>
        <th style="width: 10%;">Candidate Sig</th>
      </tr>
    </thead>
    <tbody>
      ${occupiedSeats
        .map(
          (s) => `
        <tr>
          <td class="seat-badge">${s.position.label}</td>
          <td><b>${s.student?.id || "-"}</b></td>
          <td>${s.student?.name || "-"}</td>
          <td>${s.student?.department || "-"}</td>
          <td>${s.student?.teamName || "-"}</td>
          <td style="text-align: center;"><div class="check-box"></div></td>
          <td style="text-align: center;"><div class="check-box"></div></td>
          <td><div class="sig-line"></div></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <p>Invigilator Name: __________________________</p>
      <p>Signature: ________________________________</p>
    </div>
    <div style="text-align: right;">
      <p>Present Count: ______ / ${room.totalAssigned}</p>
      <p>Absent Count: _______</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
