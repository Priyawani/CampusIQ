const DEPARTMENT_KEY = "campusiq_department_id";
export const SELECTED_DEPARTMENT_KEY = "selectedDepartment";

export function getSelectedDepartmentId(): number | null {
  const stored = localStorage.getItem(DEPARTMENT_KEY);
  if (!stored) return null;

  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setSelectedDepartmentId(departmentId: number) {
  localStorage.setItem(DEPARTMENT_KEY, String(departmentId));
}

export function getSelectedDepartmentName(): string | null {
  return localStorage.getItem(SELECTED_DEPARTMENT_KEY);
}

export function setSelectedDepartmentName(departmentName: string) {
  localStorage.setItem(SELECTED_DEPARTMENT_KEY, departmentName);
}

export function clearSelectedDepartmentId() {
  localStorage.removeItem(DEPARTMENT_KEY);
}

export function clearSelectedDepartment() {
  localStorage.removeItem(DEPARTMENT_KEY);
  localStorage.removeItem(SELECTED_DEPARTMENT_KEY);
}
