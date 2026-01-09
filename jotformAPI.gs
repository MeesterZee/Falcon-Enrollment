/** Falcon Enrollment - Jotform API v1.0 **/
/** Falcon EDU © 2023-2026 All Rights Reserved **/
/** Created by: Nick Zagorin **/

const JOTFORM_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Jotform');

const SUFFIX_MAPPINGS = {
  'jr': 'Jr.', 'jr.': 'Jr.',
  'sr': 'Sr.', 'sr.': 'Sr.',
  'ii': 'II', 'iii': 'III', 'iv': 'IV', 'v': 'V'
};

/////////////////////////
// JOTFORM INTEGRATION //
/////////////////////////

/** onChange function to detect incoming data from Jotform and normalize data  */
function onChange(e) {
  // Early returns for irrelevant change types
  if (e.changeType !== 'INSERT_ROW' && e.changeType !== 'OTHER') return;

  const sheet = e.source.getActiveSheet();

  // Early return if not the Jotform sheet
  if (!sheet || sheet.getName() !== JOTFORM_SHEET.getName()) return;

  const lastRow = sheet.getLastRow();

  // Early return if no data rows exist
  if (lastRow <= 1) return;

  const dateCols = [1, 7];
  const numRows = lastRow - 1;
  const numCols = sheet.getLastColumn();

  // Format both date columns
  dateCols.forEach(col => {
    sheet.getRange(2, col, numRows).setNumberFormat("yyyy-mm-dd");
  });

  // Sort the sheet by first date column
  sheet.getRange(2, 1, numRows, numCols).sort({ column: dateCols[0], ascending: true });

  getJotformData();
}

///////////////////
// DATA HANDLERS //
///////////////////

function getJotformData() {
  const jotformLastRow = JOTFORM_SHEET.getLastRow();
  const jotformLastCol = JOTFORM_SHEET.getLastColumn();

  // Check for data
  if (jotformLastRow < 2) {
    return;
  }
  
  // Batch read all data at once
  const allData = JOTFORM_SHEET.getRange(2, 1, jotformLastRow - 1, jotformLastCol).getDisplayValues();

  const updates = []; // Track import status
  const rowsToAppend = []; // Batch rows to append

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const status = row[1]; // Import status column is second column
    const actualRow = i + 2; // Actual sheet row number

    // Skip processed rows
    if (status === 'Success') continue;

    const data = row.slice(1); // Rest of the data (columns 2 to last)

    try {
      const formattedData = formatJotformData(data);
      
      rowsToAppend.push(formattedData);
      updates.push({ row: actualRow, status: 'Success' });
    } catch (error) {
      console.error(error);
      updates.push({ row: actualRow, status: 'Failure' });
    }
  }

  // Batch write operations
  if (rowsToAppend.length > 0) {
    const studentDataLastRow = STUDENT_DATA_SHEET.getLastRow();

    STUDENT_DATA_SHEET.getRange(studentDataLastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
  }

  // Get the updated sheet rows/columns and sort alphabetically by student name
  studentDataSheetLastRow = STUDENT_DATA_SHEET.getLastRow();
  studentDataSheetLastColumn = STUDENT_DATA_SHEET.getLastColumn();
  
  if (studentDataSheetLastRow > 1) {
    STUDENT_DATA_SHEET.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheetLastColumn)
    .sort({ column: 3, ascending: true });
  }

  // Batch status updates
  if (updates.length > 0) {
    updates.forEach(update => {
      JOTFORM_SHEET.getRange(update.row, 2).setValue(update.status);
    });
  }
}

function formatJotformData(data) {
  const isParent1 = data[7] === "Parent/guardian 1";
  const offset = isParent1 ? 0 : 5;
  
  // Build names once
  const studentName = buildStudentName(data[1], data[2], data[3]);
  const parentName = buildParentName(data[8 + offset], data[9 + offset], data[10 + offset]);
  const parentPhone = data[11 + offset] || '';
  const parentEmail = data[12 + offset] || '';

  return [
    getId(), // Student ID
    'Active', // Status
    studentName, // Student name (Last Suffix, First)
    data[4], // Gender
    data[5], // DOB
    data[6], // Incoming Grade
    'Open', // Grade Status
    parentName, // Parent/guardian name (First Last Suffix)
    parentPhone, // Parent phone ( (XXX) XXX-XXXX )
    parentEmail, // Parent email
    data[24], // Current School Name
    data[25], // Current Teacher Name
    data[26], // Current Teacher Email
    data[18], // Enrolled In EEC
    data[19], // "Discover FLS" Attendee
    data[20], // School Tour Attendee
    data[21], // Discovery Method
    data[22], // Referred By
    data[23]  // Other
  ];
}

///////////////////////
// UTILITY FUNCTIONS //
///////////////////////

/** Normalize common suffixes to proper casing **/
function normalizeSuffix(suffix) {
  if (!suffix) return '';
  const key = suffix.trim().toLowerCase();
  
  return SUFFIX_MAPPINGS[key] || suffix.trim();
}

/** Format parent name (first, last, suffix) **/
function buildParentName(first, last, suffix) {
  const norm = normalizeSuffix(suffix);
  const f = first || '';
  const l = last || '';
  
  return norm ? `${f} ${l} ${norm}`.trim() : `${f} ${l}`.trim();
}

/** Format student name (last suffix, first) **/
function buildStudentName(first, last, suffix) {
  const norm = normalizeSuffix(suffix);
  const l = last || '';
  const f = first || '';
  const lastPart = norm ? `${l} ${norm}` : l;
  
  return `${lastPart}, ${f}`.trim();
}
