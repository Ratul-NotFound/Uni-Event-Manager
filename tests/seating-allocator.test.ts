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
});
