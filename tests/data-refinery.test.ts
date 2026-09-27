import { describe, it, expect } from "vitest";
import { DataRefineryEngine } from "../src/core/engines/data-refinery";
import { StudentRecord } from "../src/core/domain/roster";

describe("DataRefineryEngine", () => {
  const sampleData: StudentRecord[] = [
    {
      id: "CSE-102",
      name: "john DOE",
      email: "john@example.com",
      phone: "01700000001",
      department: "CSE",
      batch: "52",
      section: "A",
      tshirtSize: "XL",
      foodPreference: "Non-Veg",
      paymentStatus: "Paid",
      paymentTxId: "TXN1001",
    },
    {
      id: "BBA-201",
      name: "SARA smith",
      email: "sara@example.com",
      phone: "01700000002",
      department: "BBA",
      batch: "48",
      section: "B",
      tshirtSize: "M",
      foodPreference: "Veg",
      paymentStatus: "Paid",
      paymentTxId: "TXN1002",
    },
    {
      id: "CSE-101",
      name: "ahmed AL-HASAN",
      email: "ahmed@example.com",
      phone: "01700000003",
      department: "CSE",
      batch: "52",
      section: "A",
      tshirtSize: "XL",
      foodPreference: "Non-Veg",
      paymentStatus: "Paid",
      paymentTxId: "TXN1003",
    },
    {
      id: "CSE-102", // duplicate ID
      name: "John Doe",
      email: "john_dup@example.com",
      phone: "01700000001",
      department: "CSE",
      batch: "52",
      section: "A",
      tshirtSize: "XL",
      foodPreference: "Non-Veg",
      paymentStatus: "Pending",
      paymentTxId: "TXN1004",
    },
  ];

  it("should normalize names to Title Case properly", () => {
    const normalized = DataRefineryEngine.normalizeNames(sampleData);
    expect(normalized[0].name).toBe("John Doe");
    expect(normalized[1].name).toBe("Sara Smith");
    expect(normalized[2].name).toBe("Ahmed Al-Hasan");
  });

  it("should multi-sort records by department, batch, and ID", () => {
    const sorted = DataRefineryEngine.multiSort(sampleData, [
      { key: "department", direction: "asc" },
      { key: "id", direction: "asc" },
    ]);
    expect(sorted[0].department).toBe("BBA");
    expect(sorted[1].department).toBe("CSE");
    expect(sorted[1].id).toBe("CSE-101");
  });

  it("should deduplicate records based on student ID", () => {
    const deduplicated = DataRefineryEngine.deduplicate(sampleData, "id");
    expect(deduplicated.length).toBe(3);
    const ids = deduplicated.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("should aggregate accurate T-Shirt count matrix", () => {
    const matrix = DataRefineryEngine.getTShirtMatrix(sampleData);
    expect(matrix["XL"]).toBe(3);
    expect(matrix["M"]).toBe(1);
    expect(matrix["Total"]).toBe(4);
  });

  it("should aggregate accurate meal preference breakdown", () => {
    const meals = DataRefineryEngine.getMealMatrix(sampleData);
    expect(meals["Non-Veg"]).toBe(3);
    expect(meals["Veg"]).toBe(1);
  });

  it("should evenly allocate students to mentors", () => {
    const mentors = ["Prof. Alan Turing", "Dr. Ada Lovelace"];
    const allocations = DataRefineryEngine.allocateToMentors(sampleData, mentors);
    expect(allocations.length).toBe(2);
    expect(allocations[0].students.length).toBe(2);
    expect(allocations[1].students.length).toBe(2);
  });

  it("should dynamically extract all column headers from raw rows", () => {
    const rawRows = [
      { "Student ID": "CSE-1", "Full Name": "Alice", "Project Title": "Robotics" },
      { "Student ID": "CSE-2", "Full Name": "Bob", "College Name": "Engineering" },
    ];
    const headers = DataRefineryEngine.extractHeaders(rawRows);
    expect(headers).toContain("Student ID");
    expect(headers).toContain("Full Name");
    expect(headers).toContain("Project Title");
    expect(headers).toContain("College Name");
  });

  it("should apply row-wise transformations to designated dynamic columns", () => {
    const rawRows = [
      { id: "1", name: "ALICE wonder", project: "SMART grid" },
      { id: "2", name: "bob MARLEY", project: "AI health" },
    ];
    const mapped = rawRows.map((r, i) => DataRefineryEngine.mapRawRowToStudent(r, i));

    // Apply Title Case to 'project' column row-wise
    const titleCased = DataRefineryEngine.applyColumnTransformRowWise(mapped, "project", "titleCase");
    expect(titleCased[0]["project"]).toBe("Smart Grid");
    expect(titleCased[1]["project"]).toBe("Ai Health");

    // Apply UPPERCASE to 'name' column row-wise
    const upper = DataRefineryEngine.applyColumnTransformRowWise(mapped, "name", "uppercase");
    expect(upper[0].name).toBe("ALICE WONDER");
    expect(upper[1].name).toBe("BOB MARLEY");
  });

  it("should perform row-wise find and replace across target columns", () => {
    const rawRows = [
      { id: "1", dept: "CS_Dept", notes: "Attending CS_Dept" },
      { id: "2", dept: "EE_Dept", notes: "Attending EE_Dept" },
    ];
    const mapped = rawRows.map((r, i) => DataRefineryEngine.mapRawRowToStudent(r, i));

    const replaced = DataRefineryEngine.findAndReplaceRowWise(mapped, "dept", "_Dept", " Engineering");
    expect(replaced[0]["dept"]).toBe("CS Engineering");
    expect(replaced[1]["dept"]).toBe("EE Engineering");
    // Notes column unchanged when targeting 'dept'
    expect(replaced[0]["notes"]).toBe("Attending CS_Dept");
  });

  it("should generate row objects containing all dynamic columns for export", () => {
    const rawRows = [
      { id: "1", name: "Alice", "Team Name": "CyberNova", "College": "Faculty A" },
      { id: "2", name: "Bob", "Team Name": "Quantum", "College": "Faculty B" },
    ];
    const mapped = rawRows.map((r, i) => DataRefineryEngine.mapRawRowToStudent(r, i));
    const columns = ["id", "name", "Team Name", "College"];

    const exportRows = DataRefineryEngine.exportDynamicSheet(mapped, columns);
    expect(exportRows.length).toBe(2);
    expect(exportRows[0]["Team Name"]).toBe("CyberNova");
    expect(exportRows[1]["College"]).toBe("Faculty B");
  });

  it("should assign supervisors row-wise matching contest teams so all teammates get the identical supervisor", () => {
    const contestStudents: StudentRecord[] = [
      {
        id: "T1-01",
        name: "Alice",
        email: "alice@team.com",
        department: "CSE",
        batch: "52",
        section: "A",
        tshirtSize: "M",
        foodPreference: "Veg",
        paymentStatus: "Paid",
        "Team Name": "Team Alpha",
      },
      {
        id: "T1-02",
        name: "Bob",
        email: "bob@team.com",
        department: "CSE",
        batch: "52",
        section: "A",
        tshirtSize: "L",
        foodPreference: "Non-Veg",
        paymentStatus: "Paid",
        "Team Name": "Team Alpha",
      },
      {
        id: "T2-01",
        name: "Charlie",
        email: "charlie@team.com",
        department: "EEE",
        batch: "51",
        section: "B",
        tshirtSize: "XL",
        foodPreference: "Non-Veg",
        paymentStatus: "Paid",
        "Team Name": "Team Beta",
      },
      {
        id: "T2-02",
        name: "Diana",
        email: "diana@team.com",
        department: "EEE",
        batch: "51",
        section: "B",
        tshirtSize: "S",
        foodPreference: "Veg",
        paymentStatus: "Paid",
        "Team Name": "Team Beta",
      },
    ];

    const supervisors = ["Prof. Alan Turing", "Dr. Ada Lovelace"];
    const assigned = DataRefineryEngine.assignSupervisorsRowWise(
      contestStudents,
      supervisors,
      "Course Teacher / Advisor",
      "team"
    );

    // Alice and Bob belong to Team Alpha - they must both have the SAME supervisor
    expect(assigned[0]["Course Teacher / Advisor"]).toBe("Prof. Alan Turing");
    expect(assigned[1]["Course Teacher / Advisor"]).toBe("Prof. Alan Turing");
    expect(assigned[0].advisor).toBe("Prof. Alan Turing");
    expect(assigned[1].advisor).toBe("Prof. Alan Turing");

    // Charlie and Diana belong to Team Beta - they must both have the SECOND supervisor
    expect(assigned[2]["Course Teacher / Advisor"]).toBe("Dr. Ada Lovelace");
    expect(assigned[3]["Course Teacher / Advisor"]).toBe("Dr. Ada Lovelace");
    expect(assigned[2].advisor).toBe("Dr. Ada Lovelace");
    expect(assigned[3].advisor).toBe("Dr. Ada Lovelace");
  });

  it("should assign advisors evenly in balanced mode when no teams are defined", () => {
    const students: StudentRecord[] = [
      { id: "S1", name: "Student 1", email: "s1@test.com", department: "CSE", batch: "1", section: "A", tshirtSize: "M", foodPreference: "Veg", paymentStatus: "Paid" },
      { id: "S2", name: "Student 2", email: "s2@test.com", department: "CSE", batch: "1", section: "A", tshirtSize: "M", foodPreference: "Veg", paymentStatus: "Paid" },
      { id: "S3", name: "Student 3", email: "s3@test.com", department: "CSE", batch: "1", section: "A", tshirtSize: "M", foodPreference: "Veg", paymentStatus: "Paid" },
      { id: "S4", name: "Student 4", email: "s4@test.com", department: "CSE", batch: "1", section: "A", tshirtSize: "M", foodPreference: "Veg", paymentStatus: "Paid" },
    ];

    const mentors = ["Prof. X", "Prof. Y"];
    const assigned = DataRefineryEngine.assignSupervisorsRowWise(
      students,
      mentors,
      "Supervisor",
      "balanced"
    );

    expect(assigned[0]["Supervisor"]).toBe("Prof. X");
    expect(assigned[1]["Supervisor"]).toBe("Prof. Y");
    expect(assigned[2]["Supervisor"]).toBe("Prof. X");
    expect(assigned[3]["Supervisor"]).toBe("Prof. Y");
  });

  it("should map teamName, role, institution, bloodGroup, and advisor directly from raw row", () => {
    const rawRow = {
      "Roll": "2026-CSE-001",
      "Full Name": "Alice Wonderland",
      "Team Name": "Code Wizards",
      "Role": "Team Leader",
      "Varsity / Institution": "Dhaka Tech University",
      "Blood Group": "B+",
      "Advisor / Mentor": "Dr. Alan",
    };

    const student = DataRefineryEngine.mapRawRowToStudent(rawRow, 0);
    expect(student.id).toBe("2026-CSE-001");
    expect(student.name).toBe("Alice Wonderland");
    expect(student.teamName).toBe("Code Wizards");
    expect(student.role).toBe("Team Leader");
    expect(student.institution).toBe("Dhaka Tech University");
    expect(student.bloodGroup).toBe("B+");
    expect(student.advisor).toBe("Dr. Alan");
    // Department should default to empty string, NOT "GENERAL"
    expect(student.department).toBe("");
  });
});
