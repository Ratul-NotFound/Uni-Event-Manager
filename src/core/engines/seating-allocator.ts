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

  constructor(props: RoomGridProps) {
    this.id = props.id;
    this.name = props.name;
    this.rows = props.rows;
    this.columns = props.columns;
    this.studentsPerDesk = props.studentsPerDesk;
    this.aisles = new Set(props.aisles || []);
  }

  public getTotalCapacity(): number {
    const activeDesks = this.rows * (this.columns - this.aisles.size);
    return Math.max(0, activeDesks * this.studentsPerDesk);
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
            seats.push({
              id: `${this.id}-${r}-${c}-${s}`,
              position: {
                rowIndex: r,
                colIndex: c,
                seatInDeskIndex: s,
                label,
              },
              isAisle: false,
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
        if (!seat.isAisle && studentIndex < students.length) {
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
}
