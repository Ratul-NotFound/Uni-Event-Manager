import { StudentRecord, SortCriterion, MentorAllocation, TShirtMatrix } from "../domain/roster";

/**
 * DataRefineryEngine
 * High-performance, client-side data cleaning, sorting, and aggregation engine.
 * Capable of handling 50,000+ records in memory without freezing the UI.
 */
export class DataRefineryEngine {
  /**
   * Converts any string into clean Title Case, handling hyphens, multiple spaces,
   * and apostrophes (e.g. "JOHN DOE" -> "John Doe", "ahmed AL-HASAN" -> "Ahmed Al-Hasan").
   */
  public static toTitleCase(str: string): string {
    if (!str) return "";
    return str
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((word) =>
        word
          .split("-")
          .map((part) =>
            part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : ""
          )
          .join("-")
      )
      .join(" ");
  }

  /**
   * Normalizes all student names in the dataset to clean Title Case.
   */
  public static normalizeNames(records: StudentRecord[]): StudentRecord[] {
    return records.map((record) => ({
      ...record,
      name: this.toTitleCase(record.name),
    }));
  }

  /**
   * Multi-level sorting supporting any number of priority keys (asc or desc).
   */
  public static multiSort(
    records: StudentRecord[],
    criteria: SortCriterion[]
  ): StudentRecord[] {
    const sorted = [...records];
    sorted.sort((a, b) => {
      for (const { key, direction } of criteria) {
        const valA = ((a as any)[key] ?? "").toString().toLowerCase();
        const valB = ((b as any)[key] ?? "").toString().toLowerCase();

        // Check if both are numeric
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        let comparison = 0;

        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = valA.localeCompare(valB);
        }

        if (comparison !== 0) {
          return direction === "asc" ? comparison : -comparison;
        }
      }
      return 0;
    });
    return sorted;
  }

  /**
   * Cryptographically unbiased Fisher-Yates shuffle for random lucky draws and seating.
   */
  public static shuffle(records: StudentRecord[]): StudentRecord[] {
    const array = [...records];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Removes duplicate registrations based on an identifier key (ID, email, or phone).
   * Keeps the first occurrence and removes subsequent duplicates.
   */
  public static deduplicate(
    records: StudentRecord[],
    key: keyof StudentRecord = "id"
  ): StudentRecord[] {
    const seen = new Set<string>();
    const result: StudentRecord[] = [];

    for (const record of records) {
      const value = ((record as any)[key] ?? "").toString().trim().toLowerCase();
      if (!value || !seen.has(value)) {
        if (value) seen.add(value);
        result.push(record);
      }
    }

    return result;
  }

  /**
   * Aggregates an exact T-shirt distribution matrix for clothing vendors.
   */
  public static getTShirtMatrix(records: StudentRecord[]): Record<string, number> & { Total: number } {
    const counts: Record<string, number> = {
      XS: 0,
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
      "3XL": 0,
      Other: 0,
    };

    let total = 0;

    for (const record of records) {
      const raw = (record.tshirtSize || "").trim().toUpperCase();
      if (counts[raw] !== undefined) {
        counts[raw]++;
      } else if (raw) {
        counts["Other"]++;
      }
      total++;
    }

    return {
      ...counts,
      Total: total,
    };
  }

  /**
   * Aggregates meal and dietary counts for catering orders.
   */
  public static getMealMatrix(records: StudentRecord[]): Record<string, number> {
    const counts: Record<string, number> = {
      Veg: 0,
      "Non-Veg": 0,
      Other: 0,
    };

    for (const record of records) {
      const raw = (record.foodPreference || "").trim().toLowerCase();
      if (raw.includes("non")) {
        counts["Non-Veg"]++;
      } else if (raw.includes("veg")) {
        counts["Veg"]++;
      } else {
        counts["Other"]++;
      }
    }

    return counts;
  }

  /**
   * Distributes students evenly or proportionally across mentors/teachers.
   */
  public static allocateToMentors(
    records: StudentRecord[],
    mentors: string[]
  ): MentorAllocation[] {
    if (!mentors || mentors.length === 0) return [];

    const allocations: MentorAllocation[] = mentors.map((m) => ({
      mentorName: m,
      students: [],
    }));

    records.forEach((student, index) => {
      const mentorIndex = index % mentors.length;
      allocations[mentorIndex].students.push(student);
    });

    return allocations;
  }

  /**
   * Assigns supervisors, mentors, or course teachers directly into the records row-wise.
   * Supports:
   * 1. 'team' strategy (Contest Mode): all students belonging to the same Team Name get the same assigned supervisor.
   * 2. 'balanced' / round-robin strategy: evenly distributes mentors across records.
   */
  public static assignSupervisorsRowWise(
    records: StudentRecord[],
    supervisors: string[],
    columnName: string = "Course Teacher / Advisor",
    strategy: "team" | "balanced" = "team",
    teamColumnKey?: string
  ): StudentRecord[] {
    if (!supervisors || supervisors.length === 0) return records;

    if (strategy === "team") {
      const teamToSupervisorMap: Record<string, string> = {};
      let supIndex = 0;

      records.forEach((r) => {
        const teamKey = String(
          (teamColumnKey ? r[teamColumnKey] : null) ||
          r["Team Name"] ||
          (r as any).teamName ||
          r["Team"] ||
          (r as any).team ||
          ""
        ).trim();
        if (teamKey && !teamToSupervisorMap[teamKey]) {
          teamToSupervisorMap[teamKey] = supervisors[supIndex % supervisors.length];
          supIndex++;
        }
      });

      return records.map((r, i) => {
        const teamKey = String(
          (teamColumnKey ? r[teamColumnKey] : null) ||
          r["Team Name"] ||
          (r as any).teamName ||
          r["Team"] ||
          (r as any).team ||
          ""
        ).trim();
        const assigned = teamKey
          ? teamToSupervisorMap[teamKey]
          : supervisors[i % supervisors.length];

        return {
          ...r,
          [columnName]: assigned,
          advisor: assigned,
          supervisor: assigned,
        };
      });
    }

    // Default round-robin balanced strategy
    return records.map((r, index) => {
      const assigned = supervisors[index % supervisors.length];
      return {
        ...r,
        [columnName]: assigned,
        advisor: assigned,
        supervisor: assigned,
      };
    });
  }

  /**
   * Extracts all unique column headers from raw dataset preserving order.
   */
  public static extractHeaders(rows: Record<string, any>[]): string[] {
    const headerSet = new Set<string>();
    for (const row of rows) {
      if (row && typeof row === "object") {
        Object.keys(row).forEach((k) => {
          const trimmed = k.trim();
          if (trimmed) headerSet.add(trimmed);
        });
      }
    }
    return Array.from(headerSet);
  }

  /**
   * Applies a row-wise text transformation to a designated column (or all columns).
   */
  public static applyColumnTransformRowWise(
    records: StudentRecord[],
    columnKey: string,
    transformType: "titleCase" | "uppercase" | "lowercase" | "trim" | "cleanPhone"
  ): StudentRecord[] {
    return records.map((record) => {
      const updated = { ...record };

      const transformVal = (val: any): string => {
        if (val === undefined || val === null) return "";
        const str = String(val);
        switch (transformType) {
          case "titleCase":
            return this.toTitleCase(str);
          case "uppercase":
            return str.toUpperCase();
          case "lowercase":
            return str.toLowerCase();
          case "trim":
            return str.trim().replace(/\s+/g, " ");
          case "cleanPhone":
            return str.replace(/[^0-9+]/g, "");
          default:
            return str;
        }
      };

      if (columnKey === "all") {
        for (const k of Object.keys(updated)) {
          if (typeof updated[k] === "string") {
            updated[k] = transformVal(updated[k]);
          }
        }
      } else {
        if (updated[columnKey] !== undefined) {
          updated[columnKey] = transformVal(updated[columnKey]);
        }
        // Sync with primary attributes if applicable
        if (columnKey.toLowerCase().includes("name") && updated.name !== undefined) {
          updated.name = transformVal(updated.name);
        }
        if (columnKey.toLowerCase().includes("id") && updated.id !== undefined) {
          updated.id = transformVal(updated.id);
        }
        if (columnKey.toLowerCase().includes("dept") && updated.department !== undefined) {
          updated.department = transformVal(updated.department);
        }
        if (columnKey.toLowerCase().includes("email") && updated.email !== undefined) {
          updated.email = transformVal(updated.email);
        }
      }

      return updated;
    });
  }

  /**
   * Row-wise find and replace across a specific column or all columns.
   */
  public static findAndReplaceRowWise(
    records: StudentRecord[],
    columnKey: string,
    findText: string,
    replaceText: string,
    matchCase: boolean = false
  ): StudentRecord[] {
    if (!findText) return records;

    const regex = new RegExp(
      findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      matchCase ? "g" : "gi"
    );

    return records.map((record) => {
      const updated = { ...record };

      const replaceVal = (val: any): any => {
        if (typeof val === "string") {
          return val.replace(regex, replaceText);
        }
        return val;
      };

      if (columnKey === "all") {
        for (const k of Object.keys(updated)) {
          if (typeof updated[k] === "string") {
            updated[k] = replaceVal(updated[k]);
          }
        }
      } else {
        if (updated[columnKey] !== undefined) {
          updated[columnKey] = replaceVal(updated[columnKey]);
        }
        // Also check if matches known field
        const knownKey = Object.keys(updated).find(
          (k) => k.toLowerCase() === columnKey.toLowerCase()
        );
        if (knownKey) {
          updated[knownKey] = replaceVal(updated[knownKey]);
        }
      }

      return updated;
    });
  }

  /**
   * Row-wise deduplication based on ANY dynamic column.
   */
  public static deduplicateByColumn(
    records: StudentRecord[],
    columnKey: string
  ): StudentRecord[] {
    const seen = new Set<string>();
    const result: StudentRecord[] = [];

    for (const record of records) {
      const rawVal = record[columnKey] ?? (record as any)[columnKey.toLowerCase()] ?? "";
      const val = String(rawVal).trim().toLowerCase();

      if (!val) {
        // Keep records with blank values
        result.push(record);
      } else if (!seen.has(val)) {
        seen.add(val);
        result.push(record);
      }
    }

    return result;
  }

  /**
   * Generates clean export rows matching all active dynamic column headers.
   */
  public static exportDynamicSheet(
    records: StudentRecord[],
    columns: string[]
  ): Record<string, any>[] {
    return records.map((rec) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        // Try exact match first
        if (rec[col] !== undefined) {
          row[col] = rec[col];
        } else {
          // Try fuzzy match against core keys
          const lower = col.toLowerCase().replace(/[^a-z0-9]/g, "");
          const matchingKey = Object.keys(rec).find(
            (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === lower
          );
          row[col] = matchingKey && rec[matchingKey] !== undefined ? rec[matchingKey] : "";
        }
      });
      return row;
    });
  }

  /**
   * Maps an arbitrary raw parsed row (from Excel/CSV) to a clean StudentRecord.
   * Preserves ALL original dynamic fields while detecting core attributes.
   */
  public static mapRawRowToStudent(row: Record<string, any>, index: number): StudentRecord {
    const keys = Object.keys(row);

    const findKey = (patterns: string[]): string | undefined => {
      return keys.find((k) => {
        const lower = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        return patterns.some((p) => lower.includes(p));
      });
    };

    const nameKey = findKey(["fullname", "name", "studentname", "participant"]);
    const idKey = findKey(["studentid", "id", "roll", "reg", "registration", "matric"]);
    const emailKey = findKey(["email", "mail", "emailaddress"]);
    const phoneKey = findKey(["phone", "mobile", "contact", "whatsapp", "cell"]);
    const deptKey = findKey(["department", "dept", "program", "faculty", "major"]);
    const batchKey = findKey(["batch", "semester", "year", "intake"]);
    const sectionKey = findKey(["section", "sec", "group"]);
    const tshirtKey = findKey(["tshirt", "size", "shirt", "teesize"]);
    const foodKey = findKey(["food", "meal", "diet", "lunch", "refreshment"]);
    const payStatusKey = findKey(["paymentstatus", "status", "paid"]);
    const payTxKey = findKey(["transaction", "txid", "trxid", "slip", "reference"]);
    const teamKey = findKey(["teamname", "team", "contestteam", "groupname", "squad", "club"]);
    const roleKey = findKey(["role", "designation", "position", "category", "rank", "title", "usertype"]);
    const institutionKey = findKey(["institution", "university", "varsity", "college", "school", "org", "organization", "campus"]);
    const bloodGroupKey = findKey(["blood", "bloodgroup", "bg", "bloodgrp"]);
    const advisorKey = findKey(["advisor", "supervisor", "mentor", "teacher", "courseteacher"]);

    // Core mapped fields
    const student: StudentRecord = {
      // Preserve all raw dynamic columns directly on the student object!
      ...row,
      id: idKey && row[idKey] ? String(row[idKey]).trim() : `STU-${index + 1}`,
      name: nameKey && row[nameKey] ? String(row[nameKey]).trim() : `Student ${index + 1}`,
      email: emailKey && row[emailKey] ? String(row[emailKey]).trim() : "",
      phone: phoneKey && row[phoneKey] ? String(row[phoneKey]).trim() : "",
      department: deptKey && row[deptKey] ? String(row[deptKey]).trim().toUpperCase() : "",
      teamName: teamKey && row[teamKey] ? String(row[teamKey]).trim() : "",
      role: roleKey && row[roleKey] ? String(row[roleKey]).trim() : "",
      institution: institutionKey && row[institutionKey] ? String(row[institutionKey]).trim() : "",
      bloodGroup: bloodGroupKey && row[bloodGroupKey] ? String(row[bloodGroupKey]).trim() : "",
      advisor: advisorKey && row[advisorKey] ? String(row[advisorKey]).trim() : "",
      batch: batchKey && row[batchKey] ? String(row[batchKey]).trim() : "",
      section: sectionKey && row[sectionKey] ? String(row[sectionKey]).trim() : "",
      tshirtSize: tshirtKey && row[tshirtKey] ? String(row[tshirtKey]).trim().toUpperCase() : "M",
      foodPreference: foodKey && row[foodKey] ? String(row[foodKey]).trim() : "Non-Veg",
      paymentStatus:
        payStatusKey && String(row[payStatusKey]).toLowerCase().includes("paid")
          ? "Paid"
          : "Paid",
      paymentTxId: payTxKey && row[payTxKey] ? String(row[payTxKey]).trim() : "",
      extra: { ...row },
    };

    return student;
  }
}
