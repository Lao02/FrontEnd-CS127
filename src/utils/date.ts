/**
 * Format date to YYMMDD format
 * Example: new Date(2024, 0, 15) -> "240115"
 */
export function formatDateYYMMDD(date: Date): string {
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Parse YYMMDD format string to Date
 * Example: "240115" -> Date(2024, 0, 15)
 */
export function parseYYMMDD(dateString: string): Date {
  const year = 2000 + parseInt(dateString.slice(0, 2), 10)
  const month = parseInt(dateString.slice(2, 4), 10) - 1
  const day = parseInt(dateString.slice(4, 6), 10)
  return new Date(year, month, day)
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Parse a date string from the backend (YYYY-MM-DD) as a local date
 * This prevents timezone issues that cause -1 day display
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date (string or Date object) from the backend for display
 * Handles timezone issues properly
 */
export function formatBackendDate(date: string | Date): string {
  if (!date) return '';
  
  if (typeof date === 'string') {
    const parsedDate = parseLocalDate(date);
    return parsedDate.toLocaleDateString();
  } else {
    // If it's a Date object, format the date parts to avoid timezone issues
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const localDate = parseLocalDate(`${year}-${month}-${day}`);
    return localDate.toLocaleDateString();
  }
}

/**
 * Convert a backend date (string or Date object) to input format (YYYY-MM-DD)
 * Ensures no timezone shift
 */
export function toInputDate(date: string | Date): string {
  if (!date) return '';
  
  if (typeof date === 'string') {
    const parsedDate = parseLocalDate(date);
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else {
    // If it's a Date object, extract date components
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

