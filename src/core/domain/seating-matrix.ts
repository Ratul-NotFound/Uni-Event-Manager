import { StudentRecord } from "./roster";

export interface SeatPosition {
  rowIndex: number;
  colIndex: number;
  seatInDeskIndex: number;
  label: string;
}

export interface AssignedSeat {
  id: string;
  position: SeatPosition;
  student?: StudentRecord;
  isAisle?: boolean;
}

export interface RoomGridProps {
  id: string;
  name: string;
  rows: number;
  columns: number;
  studentsPerDesk: number;
  aisles?: number[]; // Column indices marked as walking aisles
}

export interface AllocatedRoom {
  roomId: string;
  roomName: string;
  seats: AssignedSeat[];
  totalAssigned: number;
  totalCapacity: number;
}
