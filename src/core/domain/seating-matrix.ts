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
  isReserved?: boolean;
  reservedReason?: string;
}

export interface RoomGridProps {
  id: string;
  name: string;
  rows: number;
  columns: number;
  studentsPerDesk: number;
  aisles?: number[] | Set<number>; // Column indices marked as walking aisles
  reservedSeatIds?: string[] | Set<string>; // IDs of broken or VIP reserved seats
}

export interface AllocatedRoom {
  roomId: string;
  roomName: string;
  seats: AssignedSeat[];
  totalAssigned: number;
  totalCapacity: number;
}
