/** Falcon Enrollment - Web App v5.2 **/
/** Falcon EDU © 2023-2026 All Rights Reserved **/
/** Created by: Nick Zagorin **/

//////////////////////
// GLOBAL CONSTANTS //
//////////////////////

const STUDENT_DATA_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Student Data');

///////////////////////////
// PAGE RENDER FUNCTIONS //
///////////////////////////

/** Render the web app in the browser **/
function doGet(e) {
  const userSettings = getUserSettings();
  const page = e.parameter.page || "dashboard";
  const htmlTemplate = HtmlService.createTemplateFromFile(page);
  
  // Inject the user properties into the HTML
  htmlTemplate.userSettings = JSON.stringify(userSettings);

  return HtmlService.createHtmlOutput(htmlTemplate.evaluate().getContent())
    .setContent(htmlTemplate.evaluate().getContent().replace("{{NAVBAR}}", getNavbar(page)))
    .setFaviconUrl("https://meesterzee.github.io/FalconEDU/images/Falcon%20EDU%20Favicon%2032x32.png")
    .setTitle("Falcon Enrollment");
}

/** Create navigation/menu bar **/
function getNavbar(activePage) {
  const dashboardURL = getScriptURL();
  const scheduleURL = getScriptURL("page=schedule");
  const settingsURL = getScriptURL("page=settings");
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentYear = new Date().getFullYear();
  const schoolYear = scriptProperties.getProperty('schoolYear') || (currentYear + '-' + (currentYear + 1));
  const headerText = "Falcon Enrollment - " + schoolYear;

  let navbar = 
    `<div class="menu-bar">
      <button class="menu-button" onclick="showNav()">
        <div id="menu-icon">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
      <h1 id="header-text">` + headerText + `</h1>
    </div>
    <div class="nav-bar" id="nav-bar-links">
      <a href="${dashboardURL}" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
        <i class="bi bi-person-circle"></i>Dashboard
      </a>
      <a href="${scheduleURL}" class="nav-link ${activePage === 'schedule' ? 'active' : ''}">
        <i class="bi bi-calendar"></i>Schedule
      </a>
      <a href="${settingsURL}" class="nav-link ${activePage === 'settings' ? 'active' : ''}">
        <i class="bi bi-gear-wide-connected"></i>Settings
      </a>
      <button class="nav-button" onclick="showAbout()">
        <i class="bi bi-info-circle"></i>About
      </button>
    </div>
    <div class="javascript-code">
    <script>
      function showNav() {
        const icon = document.getElementById('menu-icon');
        const navbar = document.querySelector('.nav-bar');
        icon.classList.toggle('open');
        navbar.classList.toggle('show');
      }

      function showAbout() {
        const title = "<i class='bi bi-info-circle'></i>About Falcon Enrollment";
        const message = "<b>Web App Version:</b> 5.2<br><b>Build:</b> 42.102825 <br><br>© 2023-2026 - All rights reserved";
        showAlertModal(title, message, "Close");
      }
    </script>
    </div>`;

  return navbar;
}

/** Get URL of the Google Apps Script web app **/
function getScriptURL(qs = null) {
  let url = ScriptApp.getService().getUrl();
  if(qs){
    if (qs.indexOf("?") === -1) {
      qs = "?" + qs;
    }
    url = url + qs;
  }

  return url;
}

/** Include additional files in HTML **/
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/////////////////////////
// DASHBOARD FUNCTIONS //
/////////////////////////

function getStudentData() {
  return getSheetData(STUDENT_DATA_SHEET);
}

/** Get sheet data **/
function getSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  
  // Return empty array if there are no data rows
  if (lastRow <= 1) {
    return [];
  }

  // Get all headers and data in just two API calls
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
  
  // Map the data to objects using array methods
  return data.map(row => {
    return headers.reduce((obj, header, index) => {
      obj[header] = row[index];
      return obj;
    }, {});
  });
}

/** Get ID cache
function getIDCache() {
  const sheets = [
    STUDENT_DATA_SHEET
  ];
    
  const ids = sheets.reduce((acc, sheet) => {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const rangeValues = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      acc.push(...rangeValues.flat());
    }
    return acc;
  }, []);

  return ids;
}**/

/** Get ID **/
function getId(count = 1, sheetNames = [STUDENT_DATA_SHEET]) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000); // Wait for lock (timeout after 10 seconds)
    const cache = CacheService.getScriptCache();
    const reservedIds = new Set(JSON.parse(cache.get('reservedIds') || '[]').map(Number));

    // Use a single Set for all existing IDs (reserved + sheet IDs)
    const idSet = new Set(reservedIds);
    
    for (const sheet of sheetNames) {
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) continue; // Skip empty sheets
      
      const headers = data[0];
      
      // Locate ID columns (case-insensitive)
      const idColumnIndices = headers.reduce((indices, header, colIndex) => {
        if (header.toLowerCase().includes("id")) indices.push(colIndex);
        return indices;
      }, []);
      
      if (idColumnIndices.length === 0) continue; // No ID column found
      
      // Collect IDs (assume all are valid numbers)
      for (let i = 1; i < data.length; i++) {
        for (const colIndex of idColumnIndices) {
          const id = Number(data[i][colIndex]); // Directly convert to number
          idSet.add(id); // No need for NaN check
        }
      }
    }
    
    // Generate unique IDs, ensuring the lowest available ones are used
    const generatedIds = [];
    let currentId = 1;
    
    while (generatedIds.length < count) {
      if (!idSet.has(currentId)) {
        const formattedId = String(currentId).padStart(6, '0');
        generatedIds.push(formattedId);
        idSet.add(currentId); // Mark as used
      }
      currentId++;
    }
    
    // Update cache with new reserved IDs
    const updatedReservedIds = [...reservedIds, ...generatedIds.map(Number)];
    cache.put('reservedIds', JSON.stringify(updatedReservedIds), 120); // Cache for 2 mins
    
    return count === 1 ? generatedIds[0] : generatedIds;
  } finally {
    lock.releaseLock();
  }
}

////////////////////
// DATA FUNCTIONS //
////////////////////

/** Save student data */
function saveStudentData(studentData) {
  const studentID = studentData[0][0]; // First column contains the student ID
  const studentStatus = studentData[0][1]; // Second column contains the student status
  const studentDataSheet = STUDENT_DATA_SHEET;
  
  // Get all student data at once
  const studentDataSheetLastRow = studentDataSheet.getLastRow();
  if (studentDataSheetLastRow <= 1) {
    throw new Error('MISSING_STUDENT_DATA');
  }
  
  const allStudentData = studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentData[0].length).getDisplayValues();
  
  // Check for duplicate student ID's
  const duplicateCount = allStudentData.filter(row => row[0] === studentID).length;
  if (duplicateCount > 1) {
    throw new Error('DUPLICATE_ENTRY');
  }

  // Find student by ID
  const studentIndex = allStudentData.findIndex(row => row[0] === studentID);
  if (studentIndex === -1) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Validate student status
  const currentStatus = allStudentData[studentIndex][1];
  if (currentStatus !== studentStatus) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }
  
  // Update student data
  studentDataSheet.getRange(studentIndex + 2, 1, 1, studentData[0].length).setValues(studentData);

  // Format the sheet
  studentDataSheet.getRange('A:A').setNumberFormat('000000'); // Set ID format
  studentDataSheet.getRange('Z:Z').setNumberFormat('HH:mm'); // Set time format
  
  return true;
}

/** Update student status:  active/archive **/
function updateStudentStatus(studentID, studentStatus) {
  const studentDataSheet = STUDENT_DATA_SHEET;

  // Get all student data at once
  const studentDataSheetLastRow = studentDataSheet.getLastRow();
  if (studentDataSheetLastRow <= 1) {
    throw new Error('MISSING_STUDENT_DATA');
  }

  const allStudentData = studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheet.getLastColumn()).getDisplayValues();

  // Check for duplicate student ID's
  const duplicateCount = allStudentData.filter(row => row[0] === studentID).length;
  if (duplicateCount > 1) {
    throw new Error('DUPLICATE_ENTRY');
  }

  // Find student by ID
  const studentIndex = allStudentData.findIndex(row => row[0] === studentID);
  if (studentIndex === -1) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Validate student status
  const currentStatus = allStudentData[studentIndex][1];
  if (currentStatus === studentStatus) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Update student status
  studentDataSheet.getRange(studentIndex + 2, 2).setValue(studentStatus);

  return true;
}

/** Add student data **/
function addStudentData(studentData) {
  const studentID = studentData[0][0]; // First column contains the student ID
  const studentDataSheet = STUDENT_DATA_SHEET;
    
  // Check for duplicates only if there's existing data
  let studentDataSheetLastRow = studentDataSheet.getLastRow();
  let studentDataSheetLastColumn = studentDataSheet.getLastColumn();

  if (studentDataSheetLastRow > 1) {
    const allStudentData = studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheetLastColumn).getDisplayValues();
        
    // Check for duplicate student ID's
    const duplicateCount = allStudentData.filter(row => row[0] === studentID).length;
    if (duplicateCount > 1) {
      throw new Error('DUPLICATE_ENTRY');
    }
  }

  // Add student data to the sheet
  studentDataSheet.appendRow(studentData[0]);
    
  // Format the sheet
  studentDataSheet.getRange('A:A').setNumberFormat('000000'); // Set ID format
    
  // Get the updated sheet rows/columns and sort alphabetically by student name
  studentDataSheetLastRow = studentDataSheet.getLastRow();
  studentDataSheetLastColumn = studentDataSheet.getLastColumn();
  
  if (studentDataSheetLastRow > 1) {
    studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheetLastColumn)
    .sort({ column: 3, ascending: true });
  }

  return true;
}

/** Rename student in data **/
function renameStudent(studentID, studentStatus, newStudentName) {
  const studentDataSheet = STUDENT_DATA_SHEET;
  
  // Get all student data at once
  const studentDataSheetLastRow = studentDataSheet.getLastRow();
  const studentDataSheetLastColumn = studentDataSheet.getLastColumn();
  if (studentDataSheetLastRow <= 1) {
    throw new Error('MISSING_STUDENT_DATA');
  }

  const allStudentData = studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheetLastColumn).getDisplayValues();

  // Check for duplicate student ID's
  const duplicateCount = allStudentData.filter(row => row[0] === studentID).length;
  if (duplicateCount > 1) {
    throw new Error('DUPLICATE_ENTRY');
  }

  // Find student by ID
  const studentIndex = allStudentData.findIndex(row => row[0] === studentID);
  if (studentIndex === -1) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Validate student status
  const currentStatus = allStudentData[studentIndex][1];
  if (currentStatus !== studentStatus) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Update student name in student sheet
  studentDataSheet.getRange(studentIndex + 2, 3).setValue(newStudentName);
    
  // Sort alphabetically by student name
  if (studentDataSheetLastRow > 1) {
    studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheet.getLastColumn())
    .sort({ column: 3, ascending: true });
  }
  
  return true;
}

/** Delete student from student data **/
function deleteStudentData(studentID, studentStatus) {
  const studentDataSheet = STUDENT_DATA_SHEET;
  
  // Get all student data at once
  const studentDataSheetLastRow = studentDataSheet.getLastRow();
  const studentDataSheetLastColumn = studentDataSheet.getLastColumn();
  if (studentDataSheetLastRow <= 1) {
    throw new Error('MISSING_STUDENT_DATA');
  }

  const allStudentData = studentDataSheet.getRange(2, 1, studentDataSheetLastRow - 1, studentDataSheetLastColumn).getDisplayValues();
  
  // Check for duplicate student ID's
  const duplicateCount = allStudentData.filter(row => row[0] === studentID).length;
  if (duplicateCount > 1) {
    throw new Error('DUPLICATE_ENTRY');
  }

  // Find student by ID
  const studentIndex = allStudentData.findIndex(row => row[0] === studentID);
  if (studentIndex === -1) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Validate student status
  const currentStatus = allStudentData[studentIndex][1];
  if (currentStatus !== studentStatus) {
    throw new Error('MISSING_STUDENT_ENTRY');
  }

  // Delete student from studentData (adding 2 to account for header row and 0-based index)
  studentDataSheet.deleteRow(studentIndex + 2);

  return true;
}

/////////////////////
// EMAIL FUNCTIONS //
/////////////////////

/** Create and send email */
function createEmail(recipient, subject, body, attachments) {
  const emailQuota = MailApp.getRemainingDailyQuota();

  // Check user's email quota and warn if it's too low to send emails
  if (emailQuota <= 10) {
    throw new Error('QUOTA_LIMIT');
  }

  // Get the current user's email
  const currentUserEmail = Session.getActiveUser().getEmail();
  const scriptProperties = PropertiesService.getScriptProperties();
  const schoolName = scriptProperties.getProperty('schoolName')
  
  // Set senderName based on schoolName
  const senderName = schoolName || ''; // Use schoolName if it exists, else default to an empty string
  
  // Create the email message object
  const emailMessage = {
    to: recipient,
    bcc: currentUserEmail,
    replyTo: currentUserEmail,
    subject: subject,
    htmlBody: body,
    name: senderName,
  };

  // Add attachments if provided
  if (attachments) {
    const uint8Array = new Uint8Array(attachments);
    let blob;

    blob = Utilities.newBlob(uint8Array, 'application/pdf', 'First Lutheran School - Enrollment Packet.pdf');
    emailMessage.attachments = [blob];
  }

  // Send the email
  try {
    MailApp.sendEmail(emailMessage);
    return true;
  }
  catch(e) {
    throw new Error('EMAIL_FAILURE');
  }
}

////////////////////////
// SCHEDULE FUNCTIONS //
////////////////////////

// Column indices object for better maintainability
const COLS = {
  STATUS: 1,  // Column B
  STUDENT_NAME: 2, // Column C
  EVALUATION_DATE: 20, // Column U
  EVALUATION_FORM: 22, // Column W
  SCREENING_DATE: 24, // Column Y
  SCREENING_TIME: 25, // Column Z
  SUBMISSION_DATE: 30, // Column AE
  ACCEPTANCE_DATE: 32 // Column AG
};

function getAllDates() {
  // Get data once and pass it to all functions
  const data = STUDENT_DATA_SHEET.getDataRange().getDisplayValues();

  // Filter for only active students before processing
  const rows = data.slice(1).filter(row => row[COLS.STATUS] === 'Active');
  
  return {
    evaluationDates: getEvaluationDates(rows),
    screeningDates: getScreeningDates(rows),
    submissionDates: getSubmissionDates(rows),
    acceptanceDates: getAcceptanceDates(rows)
  };
}

// Utility function for date sorting
function sortByDate(arr) {
  return arr.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getEvaluationDates(rows) {
  return sortByDate(
    rows
      .filter(row => row[COLS.EVALUATION_DATE])
      .map(row => ({
        student: row[COLS.STUDENT_NAME],
        date: row[COLS.EVALUATION_DATE],
        status: row[COLS.EVALUATION_FORM] || "Status missing"
      }))
  );
}

function getScreeningDates(rows) {
  return sortByDate(
    rows
      .filter(row => row[COLS.SCREENING_DATE])
      .map(row => ({
        student: row[COLS.STUDENT_NAME],
        date: row[COLS.SCREENING_DATE],
        time: row[COLS.SCREENING_TIME] || "false"
      }))
  );
}

function getSubmissionDates(rows) {
  return sortByDate(
    rows
      .filter(row => row[COLS.SUBMISSION_DATE])
      .map(row => ({
        student: row[COLS.STUDENT_NAME],
        date: row[COLS.SUBMISSION_DATE]
      }))
  );
}

function getAcceptanceDates(rows) {
  return sortByDate(
    rows
      .filter(row => row[COLS.ACCEPTANCE_DATE])
      .map(row => {
        const documentStatus = row.slice(35, 44).map(status => 
          status || "Status missing"
        );
        
        return {
          student: row[COLS.STUDENT_NAME],
          date: row[COLS.ACCEPTANCE_DATE],
          blackbaudAccount: documentStatus[0],
          birthCertificatePassport: documentStatus[1],
          immunizationRecords: documentStatus[2],
          admissionContract: documentStatus[3],
          tuitionPayment: documentStatus[4],
          medicalConsent: documentStatus[5],
          emergencyContacts: documentStatus[6],
          technologyConsent: documentStatus[7],
          registrationFee: documentStatus[8]
        };
      })
  );
}

////////////////////////
// SETTINGS FUNCTIONS //
////////////////////////

/** Get user settings from user properties service **/
function getUserSettings() {
  const userProperties = PropertiesService.getUserProperties();

  return {
    theme: userProperties.getProperty('theme') || 'falconLight',
    customThemeType: userProperties.getProperty('customThemeType'),
    customThemePrimaryColor: userProperties.getProperty('customThemePrimaryColor'),
    customThemeAccentColor: userProperties.getProperty('customThemeAccentColor'),
    alertSound: userProperties.getProperty('alertSound') || 'alert01',
    emailSound: userProperties.getProperty('emailSound') || 'email01',
    removeSound: userProperties.getProperty('removeSound') || 'remove01',
    successSound: userProperties.getProperty('successSound') || 'success01',
    silentMode: userProperties.getProperty('silentMode') || 'false'
  };
}

/** Get app settings from script properties service */
function getAppSettings() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const currentYear = new Date().getFullYear();

  const properties = {
    schoolSettings: {
      schoolName: scriptProperties.getProperty('schoolName') || "",
      schoolYear: scriptProperties.getProperty('schoolYear') || (currentYear + '-' + (currentYear + 1))
    },
    managerSettings: {
      enrollmentManager1: scriptProperties.getProperty('enrollmentManager1') || "",
      enrollmentManager2: scriptProperties.getProperty('enrollmentManager2') || "",
      enrollmentManager3: scriptProperties.getProperty('enrollmentManager3') || "",
      enrollmentManager4: scriptProperties.getProperty('enrollmentManager4') || "",
      enrollmentManager5: scriptProperties.getProperty('enrollmentManager5') || ""
    },
    feeSettings: {
      developmentalScreeningEECFee: scriptProperties.getProperty('developmentalScreeningEECFee') || "",
      developmentalScreeningSchoolFee: scriptProperties.getProperty('developmentalScreeningSchoolFee') || "",
      academicScreeningFee: scriptProperties.getProperty('academicScreeningFee') || "",
      registrationFee: scriptProperties.getProperty('registrationFee') || "",
      hugFee: scriptProperties.getProperty('hugFee') || "",
      familyCommitmentFee: scriptProperties.getProperty('familyCommitmentFee') || "",
      flashFee: scriptProperties.getProperty('flashFee') || "",
      withdrawalFee: scriptProperties.getProperty('withdrawalFee') || ""
    },
    emailTemplateSettings: {
      waitlist: {
        subject: scriptProperties.getProperty('emailTemplateWaitlistSubject') || "",
        body: scriptProperties.getProperty('emailTemplateWaitlistBody') || ""
      },
      evaluation: {
        subject: scriptProperties.getProperty('emailTemplateEvaluationSubject') || "",
        body: scriptProperties.getProperty('emailTemplateEvaluationBody') || ""
      },
      screeningEEC: {
        subject: scriptProperties.getProperty('emailTemplateScreeningEECSubject') || "",
        body: scriptProperties.getProperty('emailTemplateScreeningEECBody') || ""
      },
      screeningSchool: {
        subject: scriptProperties.getProperty('emailTemplateScreeningSchoolSubject') || "",
        body: scriptProperties.getProperty('emailTemplateScreeningSchoolBody') || ""
      },
      acceptance: {
        subject: scriptProperties.getProperty('emailTemplateAcceptanceSubject') || "",
        body: scriptProperties.getProperty('emailTemplateAcceptanceBody') || ""
      },
      acceptanceConditional: {
        subject: scriptProperties.getProperty('emailTemplateAcceptanceConditionalSubject') || "",
        body: scriptProperties.getProperty('emailTemplateAcceptanceConditionalBody') || ""
      },
      rejection: {
        subject: scriptProperties.getProperty('emailTemplateRejectionSubject') || "",
        body: scriptProperties.getProperty('emailTemplateRejectionBody') || ""
      },
      completion: {
        subject: scriptProperties.getProperty('emailTemplateCompletionSubject') || "",
        body: scriptProperties.getProperty('emailTemplateCompletionBody') || ""
      }
    }
  };

  return properties;
}

/** Write all settings to user and script properties stores **/
function writeSettings(userSettings, appSettings) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const scriptProperties = PropertiesService.getScriptProperties();

    // Store user-specific settings in User Properties and delete unused properties
    userProperties.setProperties({
      theme: userSettings.theme || 'falconLight',
      customThemeType: userSettings.customThemeType || '',
      customThemePrimaryColor: userSettings.customThemePrimaryColor || '',
      customThemeAccentColor: userSettings.customThemeAccentColor || '',
      alertSound: userSettings.alertSound || 'alert01',
      emailSound: userSettings.emailSound || 'email01',
      removeSound: userSettings.removeSound || 'remove01',
      successSound: userSettings.successSound || 'sucess01',
      silentMode: userSettings.silentMode || 'false'
    }, true);
    
    // Store app-wide settings in Script Properties and delete unused properties
    scriptProperties.setProperties({
      // School settings
      schoolName: appSettings.schoolSettings.schoolName,
      schoolYear: appSettings.schoolSettings.schoolYear,
      
      // Enrollment manager settings
      enrollmentManager1: appSettings.managerSettings.enrollmentManager1,
      enrollmentManager2: appSettings.managerSettings.enrollmentManager2,
      enrollmentManager3: appSettings.managerSettings.enrollmentManager3, 
      enrollmentManager4: appSettings.managerSettings.enrollmentManager4,
      enrollmentManager5: appSettings.managerSettings.enrollmentManager5,

      // Fee settings
      developmentalScreeningEECFee: appSettings.feeSettings.developmentalScreeningEECFee,
      developmentalScreeningSchoolFee: appSettings.feeSettings.developmentalScreeningSchoolFee,
      academicScreeningFee: appSettings.feeSettings.academicScreeningFee,
      registrationFee: appSettings.feeSettings.registrationFee,
      hugFee: appSettings.feeSettings.hugFee,
      familyCommitmentFee: appSettings.feeSettings.familyCommitmentFee,
      flashFee: appSettings.feeSettings.flashFee,
      withdrawalFee: appSettings.feeSettings.withdrawalFee,

      // Email template settings
      emailTemplateWaitlistSubject: appSettings.emailTemplateSettings.waitlist.subject,
      emailTemplateWaitlistBody: appSettings.emailTemplateSettings.waitlist.body,

      emailTemplateEvaluationSubject: appSettings.emailTemplateSettings.evaluation.subject,
      emailTemplateEvaluationBody: appSettings.emailTemplateSettings.evaluation.body,
      
      emailTemplateScreeningEECSubject: appSettings.emailTemplateSettings.screeningEEC.subject,
      emailTemplateScreeningEECBody: appSettings.emailTemplateSettings.screeningEEC.body,

      emailTemplateScreeningSchoolSubject: appSettings.emailTemplateSettings.screeningSchool.subject,
      emailTemplateScreeningSchoolBody: appSettings.emailTemplateSettings.screeningSchool.body,

      emailTemplateAcceptanceSubject: appSettings.emailTemplateSettings.acceptance.subject,
      emailTemplateAcceptanceBody: appSettings.emailTemplateSettings.acceptance.body,

      emailTemplateAcceptanceConditionalSubject: appSettings.emailTemplateSettings.acceptanceConditional.subject,
      emailTemplateAcceptanceConditionalBody: appSettings.emailTemplateSettings.acceptanceConditional.body,
      
      emailTemplateRejectionSubject: appSettings.emailTemplateSettings.rejection.subject,
      emailTemplateRejectionBody: appSettings.emailTemplateSettings.rejection.body,

      emailTemplateCompletionSubject: appSettings.emailTemplateSettings.completion.subject,
      emailTemplateCompletionBody: appSettings.emailTemplateSettings.completion.body
    }, true);
  } catch (e) {
    throw new Error(e);
  }
}

////////////////////
// FILE FUNCTIONS //
////////////////////

function getCsv() {
  try {
    const data = STUDENT_DATA_SHEET.getDataRange().getDisplayValues();

    return data.map(rowArray => {
      return rowArray.map(field => {
        // Convert to string and trim any whitespace
        let stringField = String(field).trim();
        
        // Determine if the field needs to be quoted
        let needsQuoting = false;
        
        // Quote if: contains commas, quotes, line breaks, or is a number with leading zeros
        if (
          stringField.includes(',') || 
          stringField.includes('"') || 
          stringField.includes('\n') || 
          stringField.includes('\r') ||
          (
            // Check for leading zeros in numeric fields
            /^0\d+$/.test(stringField) && 
            !isNaN(stringField)
          )
        ) {
          needsQuoting = true;
        }

        if (needsQuoting) {
          // Escape any existing quotes by doubling them
          stringField = stringField.replace(/"/g, '""');
          // Wrap the field in quotes
          return `"${stringField}"`;
        }
        
        return stringField;
      }).join(',');
    }).join('\r\n');
  } catch(e) {
      throw new Error('EXPORT_FAILURE');
  }
}

/** Export data as a .xlsx file **/
function getXlsx() {
  try {
    const spreadsheetId = SpreadsheetApp.getActive().getId();
    const sheetId = STUDENT_DATA_SHEET.getSheetId();

    // Construct the export URL
    const url = "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?format=xlsx&gid=" + sheetId;
    
    // Fetch the xlsx file as a blob
    const blob = UrlFetchApp.fetch(url, {headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}}).getBlob();
    
    // Return blob as binary
    return blob.getBytes();
  } catch(e) {
      throw new Error('EXPORT_FAILURE');
  }
}
