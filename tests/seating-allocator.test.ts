import { describe, it, expect } from "vitest";
import { StudentRecord } from "../src/core/domain/roster";
import {
  RoomGrid,
  SeatingAllocatorEngine,
} from "../src/core/engines/seating-allocator";

describe("SeatingAllocatorEngine", () => {
  const sampleStudents: StudentRecord[] = [
    { id: "S1", name: "Student 1", department: "CSE", email: "s1@u.edu" },
    { id: "S2", name: "Student 2", department: "CSE", email: "s2@u.edu" },
    { id: "S3", name: "Student 3", department: "BBA", email: "s3@u.edu" },
    { id: "S4", name: "Student 4", department: "BBA", email: "s4@u.edu" },
    { id: "S5", name: "Student 5", department: "EEE", email: "s5@u.edu" },
    { id: "S6", name: "Student 6", department: "EEE", email: "s6@u.edu" },
  ];

  it("should create a room grid with valid capacity", () => {
    const room = new RoomGrid({
      id: "room-101",
      name: "Hall 101",
      rows: 5,
      columns: 4,
      studentsPerDesk: 2,
    });

    expect(room.getTotalCapacity()).toBe(40);
  });

  it("should interleave students by department to prevent cheating", () => {
    const room = new RoomGrid({
      id: "hall-a",
      name: "Hall A",
      rows: 3,
      columns: 2,
      studentsPerDesk: 1,
    });

    const allocated = SeatingAllocatorEngine.allocateInterleaved(
      sampleStudents,
      [room]
    );

    const roomSeats = allocated[0].seats;
    // Seat 0 and Seat 1 should have different departments
    if (roomSeats[0].student && roomSeats[1].student) {
      expect(roomSeats[0].student.department).not.toBe(
        roomSeats[1].student.department
      );
    }
  });

  it("should sequentially allocate students by roll / ID", () => {
    const room = new RoomGrid({
      id: "hall-seq",
      name: "Hall Sequential",
      rows: 3,
      columns: 2,
      studentsPerDesk: 1,
    });

    const allocated = SeatingAllocatorEngine.allocateSequential(
      sampleStudents,
      [room]
    );

    expect(allocated[0].seats[0].student?.id).toBe("S1");
    expect(allocated[0].seats[1].student?.id).toBe("S2");
  });

  it("should cluster team members together in team-clustered allocation", () => {
    const teamStudents: StudentRecord[] = [
      { id: "T1", name: "Alice", department: "CSE", teamName: "Alpha", email: "t1@u.edu" },
      { id: "T2", name: "Bob", department: "EEE", teamName: "Beta", email: "t2@u.edu" },
      { id: "T3", name: "Charlie", department: "BBA", teamName: "Alpha", email: "t3@u.edu" },
      { id: "T4", name: "Dave", department: "CSE", teamName: "Beta", email: "t4@u.edu" },
    ];

    const room = new RoomGrid({
      id: "hall-team",
      name: "Hall Team",
      rows: 2,
      columns: 2,
      studentsPerDesk: 1,
    });

    const allocated = SeatingAllocatorEngine.allocateTeamClustered(
      teamStudents,
      [room]
    );

    const s0 = allocated[0].seats[0].student;
    const s1 = allocated[0].seats[1].student;
    // Teammates of Alpha should sit together at indices 0 and 1
    expect(s0?.teamName).toBe("Alpha");
    expect(s1?.teamName).toBe("Alpha");
  });

  it("should skip broken/reserved seats during allocation", () => {
    const room = new RoomGrid({
      id: "hall-res",
      name: "Hall Reserved",
      rows: 2,
      columns: 2,
      studentsPerDesk: 1,
      reservedSeatIds: ["hall-res-0-0-0"], // Row 0, Col 0 is broken
    });

    expect(room.getTotalCapacity()).toBe(3);

    const allocated = SeatingAllocatorEngine.allocateSequential(
      sampleStudents,
      [room]
    );

    // First seat is reserved, so S1 must be seated at seat 1
    expect(allocated[0].seats[0].isReserved).toBe(true);
    expect(allocated[0].seats[0].student).toBeUndefined();
    expect(allocated[0].seats[1].student?.id).toBe("S1");
  });

  it("should generate valid printable invigilator attendance sheet HTML", () => {
    const room = new RoomGrid({
      id: "hall-att",
      name: "Auditorium A",
      rows: 2,
      columns: 2,
      studentsPerDesk: 1,
    });

    const allocated = SeatingAllocatorEngine.allocateSequential(
      sampleStudents.slice(0, 2),
      [room]
    );

    const html = SeatingAllocatorEngine.generateAttendanceSheetHtml(
      allocated[0],
      "Annual Hackathon 2026",
      "Dr. Alan Turing"
    );

    expect(html).toContain("Attendance Roster - Auditorium A");
    expect(html).toContain("Annual Hackathon 2026");
    expect(html).toContain("Dr. Alan Turing");
    expect(html).toContain("Candidate Sig");
    expect(html).toContain("Student 1");
  });
});
