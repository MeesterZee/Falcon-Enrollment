<script type="text/javascript">
  const STUDENT_KEY_MAPPINGS = {
    // Basic information    
    'gender': 'Gender', 'dateOfBirth': 'Date Of Birth', 'incomingGrade': 'Incoming Grade', 'gradeStatus': 'Grade Status', 'enrollmentManager': 'Enrollment Manager', 
    
    // Parent/guardian information
    'parentGuardianName': 'Parent/Guardian Name', 'parentGuardianPhone': 'Parent/Guardian Phone', 'parentGuardianEmail': 'Parent/Guardian Email',

    // School/teacher information
    'currentSchoolName': 'Current School Name', 'currentTeacherName': 'Current Teacher Name', 'currentTeacherEmail': 'Current Teacher Email', 
    
    // EEC information
    'enrolledInEEC': 'Enrolled In EEC',

    // Outreach information
    'discoverFLS': '"Discover FLS" Attendee',
    'schoolTour': 'School Tour Attendee',
    'discoveryMethod': 'Discovery Method',
    'referredBy': 'Referred By',
    'other': 'Other',

    // Student evaluation
    'evaluationDueDate': 'Evaluation Due Date', 'evaluationEmail': 'Evaluation Email Sent', 
    
    // Student evaluation form
    'evaluationForm': 'Evaluation Form', 
    
    // Student screening
    'contactedToSchedule': 'Contacted To Schedule', 'screeningDate': 'Screening Date', 'screeningTime': 'Screening Time', 'screeningEmail': 'Screening Email Sent', 
    
    // Student screening documents
    'reportCard': 'Report Card', 'iepDocumentation': 'IEP Documentation', 'screeningFee': 'Screening Fee', 
    
    // Student acceptance
    'adminSubmissionDate': 'Admin Submission Date', 'adminAcceptance': 'Admin Acceptance', 'acceptanceDueDate': 'Acceptance Due Date', 'acceptanceEmail': 'Acceptance Email', 'familyAcceptance': 'Family Acceptance',
    
    // Student acceptance documents
    'blackbaudAccount': 'Blackbaud Account', 'birthCertificatePassport': 'Birth Certificate/Passport', 'immunizationRecords': 'Immunization Records', 'admissionContractForm': 'Admission Contract Form', 'tuitionPaymentForm': 'Tuition Payment Form', 'medicalConsentForm': 'Medical Consent Form', 'emergencyContactsForm': 'Emergency Contacts Form', 'techConsentForm': 'Technology Consent Form', 'registrationFee': 'Registration Fee',

    // Notes
    'notes': 'Notes'
  };
  
  // Global variables  
  let STUDENT_DATA;
  let APP_SETTINGS;

  // Global IDs
  let previousStudentID;
  
  // Global flags
  let saveFlag = true; // True if all changes saved, false if unsaved changes
  let busyFlag = false; // True if operation in progress, false if no operation in progress

  // Initialize application
  window.onload = async function() {
    console.log("Initializing dashboard...");

    // Get main elements
    const toolbar = document.getElementById('toolbar');
    const page = document.getElementById('page');
    const loadingIndicator = document.getElementById('loading-indicator');

    try {
      // Fetch data in parallel
      const [studentData, settings] = await Promise.all([
        new Promise((resolve, reject) => {
          google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getStudentData();
        }),
        new Promise((resolve, reject) => {
          google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getAppSettings();
        })
      ]);

      // Assign data to global variables
      APP_SETTINGS = settings;
      STUDENT_DATA = studentData;

      // Initialize the dashboard
      setEventListeners();
      populateDashboard();

      console.log("Initialization complete!");

    } catch (error) {
      console.error("Error during initialization:", error);
    
    } finally {
      // Hide loading indicator and show page elements
      loadingIndicator.style.display = 'none';
      toolbar.style.display = 'block';
      page.style.display = 'flex';
    }
  };
    
  function setEventListeners() {
    console.log("Setting event listeners...");

    // Discovery method elements
    const discoveryMethodSelect = document.getElementById('discoveryMethod');
    const referredByElement = document.getElementById('referredByElement');
    const otherElement = document.getElementById('otherElement');
    const referredByInput = document.getElementById('referredBy');
    const otherInput = document.getElementById('other');
    
    // Add student discovery method elements
    const addDiscoveryMethodSelect = document.getElementById('addDiscoveryMethod');
    const addReferredByElement = document.getElementById('addReferredByElement');
    const addOtherElement = document.getElementById('addOtherElement');
    const addReferredByInput = document.getElementById('addReferredBy');
    const addOtherInput = document.getElementById('addOther');
    
    // Check for unsaved changes or busy state before closing the window
    window.addEventListener('beforeunload', function (e) {
      if (!saveFlag || busyFlag) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Add event listeners for tool bar buttons
    document.getElementById('saveChangesButton').addEventListener('click', saveProfile);
    document.getElementById('addStudentButton').addEventListener('click', addStudent);
    document.getElementById('removeStudentButton').addEventListener('click', removeStudent);
    document.getElementById('renameStudentButton').addEventListener('click', renameStudent);
    document.getElementById('activateStudentButton').addEventListener('click', activateStudent);
    document.getElementById('deleteStudentButton').addEventListener('click', deleteStudent);
    document.getElementById('emailButton').addEventListener('click', composeEmail);
    document.getElementById('exportFormsButton').addEventListener('click', exportForms);
    document.getElementById('exportDataButton').addEventListener('click', exportData);

    // Dropdown event listeners
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      const dropdownContent = dropdown.querySelector('.dropdown-content');

      dropdown.addEventListener('mouseenter', () => {
        dropdown.classList.add('active');
      });

      dropdown.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!dropdown.matches(':hover')) {
            dropdown.classList.remove('active');
          }
        }); // Small delay to prevent flickering
      });
    });

    // Toggle data view button
    const options = [
      { text: "<i class='bi bi-eye'></i>Active", color: "var(--green)" },
      { text: "<i class='bi bi-eye'></i>Archive", color: "var(--gray)" }
    ];

    // Initialize the button state
    let currentIndex = 0;
    const button = document.getElementById('toggleDataButton');
    button.setAttribute('data-state', currentIndex);

    button.addEventListener('click', () => {
      if (busyFlag) {
        showError("Error: OPERATION_IN_PROGRESS");
        return;
      }

      if (!saveFlag) {
        showError("Error: UNSAVED_CHANGES");
        return;
      }

      // Update the index to the next option, cycling back to 0 if at the end
      currentIndex = (currentIndex + 1) % options.length;

      // Update the button text and background color
      button.innerHTML = options[currentIndex].text;
      button.style.backgroundColor = options[currentIndex].color;
      button.setAttribute('data-state', currentIndex);
      toggleDataView();
    });

    // Add event listener for studentNameSelectBox
    const studentNameSelectBox = document.getElementById('studentName');
    studentNameSelectBox.addEventListener('change', function() {
      const currentStudent = studentNameSelectBox.value;
      if (!saveFlag) {
        showError("Error: UNSAVED_CHANGES");
        studentNameSelectBox.value = previousStudentID;
      }
      else {
        updateStudentData(currentStudent);
      }
    });

    // Add event listeners for select boxes
    const selectColorElements = document.querySelectorAll('#gender, #incomingGrade, #enrollmentManager, #gradeStatus, #enrolledInEEC, #discoverFLS, #schoolTour, #discoveryMethod, #evaluationEmail, #evaluationForm, #contactedToSchedule, #screeningEmail, #reportCard, #iepDocumentation, #screeningFee, #adminAcceptance, #acceptanceEmail, #familyAcceptance, #blackbaudAccount, #birthCertificatePassport, #immunizationRecords, #admissionContractForm, #tuitionPaymentForm, #medicalConsentForm, #emergencyContactsForm, #techConsentForm, #registrationFee');
    const inputColorElements = document.querySelectorAll('#dateOfBirth, #parentGuardianName, #parentGuardianPhone, #parentGuardianEmail, #currentSchoolName, #currentTeacherName, #currentTeacherEmail, #referredBy, #other, #evaluationDueDate, #screeningDate, #screeningTime, #adminSubmissionDate, #acceptanceDueDate');
    const noColorElements = document.querySelectorAll('#notes');

    selectColorElements.forEach(element => {
      element.addEventListener('change', () => {
        saveAlert();
        element.style.backgroundColor = getColor(element);
      });
    });

    inputColorElements.forEach(element => {
      element.addEventListener('input', () => {
        saveAlert();
        element.style.backgroundColor = getColor(element);
        if (element.id === 'parentGuardianPhone') {
          formatPhoneNumber(element);
        }
      });
    });

    noColorElements.forEach(element => {
      const eventType = element.tagName === 'SELECT' ? 'change' : 'input';
      element.addEventListener(eventType, () => {
        saveAlert();
      });
    });

    // Allow deletion of select box entries with exceptions
    document.querySelectorAll("select:not(#studentName, #templateSelect, #formSelect, #dataTypeSelect, #fileTypeSelect)").forEach(function(select) {
      select.addEventListener("keydown", function(event) {
        if (event.key === "Backspace" || event.key === "Delete") {
          if (!select.closest("#addStudentModal")) {
            saveAlert();
          }
          select.value = '';
          select.style.backgroundColor = '';

          // Check if it's the discoveryMethod select box
          if (select.id === "discoveryMethod") {
            removeProfileDynamicRows();
          }

          if (select.id === "addDiscoveryMethod") {
            removeAddStudentDynamicRows();
          }
        }
      });
    });

    // Add event listener for phone number input on Add Student modal
    const addParentGuardianPhoneInput = document.getElementById('addParentGuardianPhone');
    addParentGuardianPhoneInput.addEventListener('input', function(event) {
      formatPhoneNumber(this);
    });

    // Add event listener for email template selection on Email modal
    const templateSelect = document.getElementById('templateSelect');
    templateSelect.addEventListener('change', function() {
      getEmailTemplate();
    });

    // Add event listeners for 'Discovery method' in Student Profile and Add Student 
    const outreachInfoTable = document.getElementById('outreachInfoTable');
    const addOutreachInfoTable = document.getElementById('addOutreachInfoTable');
    const referralOptions = [
      'Referred by EEC/school family',
      'Referred by employee',
      'Referred by alumni',
      'Referred by community partner'
    ];

    discoveryMethodSelect.addEventListener('change', function () {
      const selectedValue = discoveryMethodSelect.value;
      removeProfileDynamicRows(); // Clear any existing

      let inputId;

      if (referralOptions.includes(selectedValue)) {
        const row = outreachInfoTable.insertRow(-1);
        row.classList.add('dynamic-row');
        inputId = 'referredBy';
        row.innerHTML = `
          <td>Referred By:</td>
          <td><input class="table-input" type="text" id="${inputId}"></td>
        `;
      } else if (selectedValue === 'Other') {
        const row = outreachInfoTable.insertRow(-1);
        row.classList.add('dynamic-row');
        inputId = 'other';
        row.innerHTML = `
          <td>Other:</td>
          <td><input class="table-input" type="text" id="${inputId}"></td>
        `;
      }

      // Attach color input listener if applicable
      if (inputId) {
        const newInput = document.getElementById(inputId);
        if (newInput) {
          newInput.addEventListener('input', () => {
            saveAlert();
            newInput.style.backgroundColor = getColor(newInput);
          });
        }
      }
    });

    addDiscoveryMethodSelect.addEventListener('change', function () {
      const selectedValue = addDiscoveryMethodSelect.value;
      removeAddStudentDynamicRows(); // Clear any existing

      if (referralOptions.includes(selectedValue)) {
        const row = addOutreachInfoTable.insertRow(-1);
        
        row.classList.add('dynamic-row');
        row.innerHTML = `
          <td>Referred By:</td>
          <td><input class="table-input" type="text" id="addReferredBy"></td>
        `;
      } else if (selectedValue === 'Other') {
        const row = addOutreachInfoTable.insertRow(-1);
        
        row.classList.add('dynamic-row');
        row.innerHTML = `
          <td>Other:</td>
          <td><input class="table-input" type="text" id="addOther"></td>
        `;
      }
    });

    function removeProfileDynamicRows() {
      const dynamicRows = outreachInfoTable.querySelectorAll('.dynamic-row');
      dynamicRows.forEach(row => row.remove());
    }

    function removeAddStudentDynamicRows() {
      const dynamicRows = addOutreachInfoTable.querySelectorAll('.dynamic-row');
      dynamicRows.forEach(row => row.remove());
    }

    // Add paste event listeners to rich text inputs
    const richTextBoxes = document.querySelectorAll('.rich-text-box');
    richTextBoxes.forEach(input => {
      input.addEventListener("paste", function (event) {
        // Prevent the default paste behavior
        event.preventDefault();

        // Get the plain text from the clipboard
        const text = event.clipboardData.getData("text/plain");

        // Insert the plain text at the cursor position
        document.execCommand("insertText", false, text);
      });
    });

    // Profile search event listener
    const profileSearchInput = document.getElementById('profileSearch');

    profileSearchInput.addEventListener('keyup', () => {
      const filter = profileSearchInput.value.toLowerCase();
      const toggleDataButton = document.getElementById('toggleDataButton');
      const dataFilter = parseInt(toggleDataButton.getAttribute('data-state'), 10);

      // Clear the current options in the studentNameSelectBox
      while (studentNameSelectBox.firstChild) {
        studentNameSelectBox.removeChild(studentNameSelectBox.firstChild);
      }

      // Filter STUDENT_DATA based on the selected database
      let filteredStudentData = STUDENT_DATA;

      if (dataFilter === 0) {
        filteredStudentData = STUDENT_DATA.filter(item => item['Status'] === 'Active');
      } else if (dataFilter === 1) {
        filteredStudentData = STUDENT_DATA.filter(item => item['Status'] === 'Archive');
      }

      // Further filter the already filteredStudentData based on the search input
      const filteredStudents = filteredStudentData.filter(student => {
        return Object.keys(student).some(key => {
          if ([
            'Student Name',
            'Gender',
            'Date Of Birth',
            'Incoming Grade',
            'Grade Status',
            'Enrollment Manager',
            'Parent/Guardian Name',
            'Parent/Guardian Phone',
            'Current School Name',
            'Current Teacher Name',
            'Current Teacher Email',
            'Enrolled In EEC',
            '"Discover FLS" Attendee',
            'School Tour Attendee',
            'Discovery Method'
          ].includes(key)) {
            const value = student[key] ? student[key].toString().toLowerCase() : '';
            return value.includes(filter);
          }
          return false;
        });
      });

      // Populate the studentNameSelectBox with the filtered results
      filteredStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student['Student ID'];
        option.textContent = student['Student Name'];
        studentNameSelectBox.appendChild(option);
      });

      if (filteredStudents.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '';
        studentNameSelectBox.appendChild(option);
        updateStudentData("");
      } else {
        updateStudentData(filteredStudents[0]['Student ID']);
      }
    });

    // Add event listener to prevent escaping dialogs
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const dialog = document.querySelector('dialog[open]');
        if (dialog) {
          event.preventDefault(); // Prevent ESC from closing the dialog
          
          // Remove focus from all buttons within the dialog
          const buttons = dialog.querySelectorAll('button');
          buttons.forEach((button) => {
            button.blur(); // Remove focus from button
          });
        }
      }
    });

    console.log("Complete!");
  }

  function populateDashboard() {
    console.log("Populating dashboard...");

    // Add enrollment manager options to dashboard and 'Add Student' modal
    const enrollmentManagerSelect = document.getElementById('enrollmentManager');
    const addEnrollmentManagerSelect = document.getElementById('addEnrollmentManager');
    
    // Iterate through enrollmentManager keys and populate select
    for (let i = 1; i <= 5; i++) {
      let key = `enrollmentManager${i}`;
      let managerName = APP_SETTINGS.managerSettings[key];

      if (managerName && managerName.trim() !== '') {
        let option = document.createElement('option');
        option.text = managerName;
        enrollmentManagerSelect.add(option);
        addEnrollmentManagerSelect.add(option.cloneNode(true));
      }
    }

    // Set initial values for Add modal select boxes
    addStudentModal.querySelectorAll('select').forEach(function(select) {
      select.value = '';
    });
    
    updateStudentNames();
    
    console.log("Complete!");
  }

  //////////////////////////////
  // ACTIVE/ARCHIVE DATA VIEW //
  //////////////////////////////

  function toggleDataView() {
    const toggleDataButton = document.getElementById('toggleDataButton');
    const stateIndex = parseInt(toggleDataButton.getAttribute('data-state'), 10);
    
    switch (stateIndex) {
      // Active data
      case 0:
        // Update the toolbar UI
        document.getElementById('addStudentButton').style.display = "block";
        document.getElementById('removeStudentButton').style.display = "block";
        document.getElementById('activateStudentButton').style.display = "none";
        document.getElementById('deleteStudentButton').style.display = "none";
        document.getElementById('emailButton').style.display = "block";
        break;

      // Archive data
      case 1:
        // Update the toolbar UI
        document.getElementById('addStudentButton').style.display = "none";
        document.getElementById('removeStudentButton').style.display = "none";
        document.getElementById('activateStudentButton').style.display = "block";
        document.getElementById('deleteStudentButton').style.display = "block";
        document.getElementById('emailButton').style.display = "none";
        break;
    }

    updateStudentNames();
  }

  //////////////////
  // SAVE PROFILE //
  //////////////////

  function saveProfile() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }

    const studentNameSelectBox = document.getElementById('studentName');
    if (studentNameSelectBox.options.length === 0) {
      showError("Error: MISSING_STUDENT_DATA");
      return;
    }

    const selectedStudentID = studentNameSelectBox.value;

    // Create working copies
    const tempStudentData = [...STUDENT_DATA];
    const student = tempStudentData.find(item => item['Student ID'] === selectedStudentID);

    // Update static fields
    Object.entries(STUDENT_KEY_MAPPINGS).forEach(([elementId, dataKey]) => {
      const element = document.getElementById(elementId);
      if (element) {
        student[dataKey] = element.value;
      }
    });

    // Update dynamic fields
    student['Referred By'] = (document.getElementById('referredBy') || {}).value || '';
    student['Other']       = (document.getElementById('other') || {}).value || '';

    const studentDataArray = [[
      student['Student ID'],
      student['Status'],
      student['Student Name'],
      ...Object.keys(STUDENT_KEY_MAPPINGS).map(key => student[STUDENT_KEY_MAPPINGS[key]])
    ]];

    busyFlag = true;
    showToast("", "Saving changes...", 5000);

    google.script.run
      .withSuccessHandler(() => {
        STUDENT_DATA = tempStudentData;
        document.getElementById('saveChangesButton').classList.remove('tool-bar-button-unsaved');

        showToast("", `'${student['Student Name']}' saved successfully!`, 5000);
        playNotificationSound("success");

        saveFlag = true;
        busyFlag = false;
      })
      .withFailureHandler((error) => {
        const errorString = String(error);

        if (errorString.includes("401")) {
          sessionError();
        } else if (errorString.includes("permission")) {
          showError("Error: PERMISSION");
        } else {
          showError(error.message);
        }
        saveFlag = true;
        busyFlag = false;
      })
      .saveStudentData(studentDataArray);
  }

  /////////////////
  // ADD STUDENT //
  /////////////////

  async function addStudent() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }

    if (!saveFlag) {
      showError("Error: UNSAVED_CHANGES");
      return;
    }

    showActionModal("addStudentModal");

    const addStudentModalButton = document.getElementById("addStudentModalButton");

    addStudentModalButton.onclick = async function() {
      if (addStudentErrorCheck()) {
        return;
      }

      busyFlag = true;
      
      // Get the form data
      const toggleDataButton = document.getElementById('toggleDataButton');
      const dataFilter = parseInt(toggleDataButton.getAttribute('data-state'), 10);
      let status;

      if (dataFilter === 0) {
        status = 'Active';
      }
      else if (dataFilter === 1) {
        status = 'Archive';
      }
      
      const firstName = document.getElementById('addFirstName').value;
      const lastName = document.getElementById('addLastName').value;
      const studentName = lastName + ", " + firstName;

      // Create temporary student object
      const tempStudent = {
        'Status': status,
        'Student Name': studentName,
        'Gender': document.getElementById('addGender').value,
        'Date Of Birth': document.getElementById('addDateOfBirth').value,
        'Incoming Grade': document.getElementById('addIncomingGrade').value,
        'Grade Status': document.getElementById('addGradeStatus').value,
        'Enrollment Manager': document.getElementById('addEnrollmentManager').value,
        'Parent/Guardian Name': document.getElementById('addParentGuardianName').value,
        'Parent/Guardian Phone': document.getElementById('addParentGuardianPhone').value,
        'Parent/Guardian Email': document.getElementById('addParentGuardianEmail').value,
        'Current School Name': document.getElementById('addCurrentSchoolName').value,
        'Current Teacher Name': document.getElementById('addCurrentTeacherName').value,
        'Current Teacher Email': document.getElementById('addCurrentTeacherEmail').value,
        'Enrolled In EEC': document.getElementById('addEnrolledInEEC').value,
        '"Discover FLS" Attendee': document.getElementById('addDiscoverFLS').value,
        'School Tour Attendee': document.getElementById('addSchoolTour').value,
        'Discovery Method': document.getElementById('addDiscoveryMethod').value,
        'Referred By': (document.getElementById('addReferredBy') || {}).value || '',
        'Other': (document.getElementById('addOther') || {}).value || ''
      };

      closeActionModal("addStudentModal");
      showToast("", "Adding student...", 5000);

      tempStudent['Student ID'] = await getAvailableId();

      // Build the array of data for the sheet
      const newStudentArray = [[
        tempStudent['Student ID'],
        tempStudent['Status'],
        tempStudent['Student Name'],
        tempStudent['Gender'],
        tempStudent['Date Of Birth'],
        tempStudent['Incoming Grade'],
        tempStudent['Grade Status'],
        tempStudent['Enrollment Manager'],
        tempStudent['Parent/Guardian Name'],
        tempStudent['Parent/Guardian Phone'],
        tempStudent['Parent/Guardian Email'],
        tempStudent['Current School Name'],
        tempStudent['Current Teacher Name'],
        tempStudent['Current Teacher Email'],
        tempStudent['Enrolled In EEC'],
        tempStudent['"Discover FLS" Attendee'],
        tempStudent['School Tour Attendee'],
        tempStudent['Discovery Method'],
        tempStudent['Referred By'],
        tempStudent['Other']
      ]];
    
      google.script.run
        .withSuccessHandler(() => {
          STUDENT_DATA.push(tempStudent);
          updateStudentNames();
                    
          const studentNameSelectBox = document.getElementById('studentName');
          studentNameSelectBox.value = tempStudent['Student ID'];
          studentNameSelectBox.dispatchEvent(new Event('change'));
                    
          showToast("", `${tempStudent['Student Name']} added successfully!`, 5000);
          playNotificationSound("success");
          busyFlag = false;
        })
        .withFailureHandler((error) => {
          const errorString = String(error);
          
          if (errorString.includes("401")) {
            sessionError();
          }
          else if (errorString.includes("permission")) {
            showError("Error: PERMISSION");
          }
          else {
            showError(error.message);
          }
          busyFlag = false;
        })
      .addStudentData(newStudentArray);
    }
  }

  function addStudentErrorCheck() {
    const firstName = document.getElementById('addFirstName').value;
    const lastName = document.getElementById('addLastName').value;
    const gender = document.getElementById('addGender').value;
    const dateOfBirth = document.getElementById('addDateOfBirth').value;
    const incomingGrade = document.getElementById('addIncomingGrade').value;
    const gradeStatus = document.getElementById('addGradeStatus').value;
    const enrollmentManager = document.getElementById('addEnrollmentManager').value;
    const parentGuardianName = document.getElementById('addParentGuardianName').value;
    const parentGuardianPhone = document.getElementById('addParentGuardianPhone').value;
    const parentGuardianEmail = document.getElementById('addParentGuardianEmail').value;
    const currentSchoolName = document.getElementById('addCurrentSchoolName').value;
    const currentTeacherName = document.getElementById('addCurrentTeacherName').value;
    const currentTeacherEmail = document.getElementById('addCurrentTeacherEmail').value;
    const enrolledInEEC = document.getElementById('addEnrolledInEEC').value;
    const discoverFLS = document.getElementById('addDiscoverFLS').value;
    const schoolTour = document.getElementById('addSchoolTour').value;
    const discoveryMethod = document.getElementById('addDiscoveryMethod').value;
    let referredBy = '';
    let other = '';

    const referredByInput = document.getElementById('addReferredBy');
    if (referredByInput) {
      referredBy = referredByInput.value;
    }

    const otherInput = document.getElementById('addOther');
    if (otherInput) {
      other = otherInput.value;
    }

    // Define regular expression patterns for error handling
    const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9-]{2,})+$/;

    // Define referral options
    const referralOptions = [
      'Referred by EEC/school family',
      'Referred by employee',
      'Referred by alumni',
      'Referred by community partner'
    ];
    
    if (!firstName) {
      showError("Error: MISSING_FIRST_NAME");
      return true;
    }
    if (!lastName) {
      showError("Error: MISSING_LAST_NAME");
      return true;
    }
    if (!gender) {
      showError("Error: MISSING_GENDER");
      return true;
    }
    if (!dateOfBirth) {
      showError("Error: MISSING_DOB");
      return true;
    }
    if (!incomingGrade) {
      showError("Error: MISSING_INCOMING_GRADE");
      return true;
    }
    if (!gradeStatus) {
      showError("Error: MISSING_GRADE_STATUS");
      return true;
    }
    if (!enrollmentManager) {
      showError("Error: MISSING_ENROLLMENT_MANAGER");
      return true;
    }
    if (!parentGuardianName) {
      showError("Error: MISSING_PARENT_GUARDIAN_NAME");
      return true;
    }
    if (!parentGuardianPhone) {
      showError("Error: MISSING_PARENT_GUARDIAN_PHONE");
      return true;
    }
    if (!phonePattern.test(parentGuardianPhone)) {
      showError("Error: INVALID_PHONE");
      return true;
    }
    if (!parentGuardianEmail) {
      showError("Error: MISSING_PARENT_GUARDIAN_EMAIL");
      return true;
    }
    if (!emailPattern.test(parentGuardianEmail)) {
      showError("Error: INVALID_PARENT_GUARDIAN_EMAIL");
      return true;
    }
    if (!currentSchoolName) {
      showError("Error: MISSING_CURRENT_SCHOOL_NAME");
      return true;
    }
    if (!currentTeacherName) {
      showError("Error: MISSING_CURRENT_TEACHER_NAME");
      return true;
    }
    if (!currentTeacherEmail) {
      showError("Error: MISSING_CURRENT_TEACHER_EMAIL");
      return true;
    }
    if (!emailPattern.test(currentTeacherEmail)) {
      showError("Error: INVALID_CURRENT_TEACHER_EMAIL");
      return true;
    }
    if (!enrolledInEEC) {
      showError("Error: MISSING_EEC_STATUS");
      return true;
    }
    if (!discoverFLS) {
      showError("Error: MISSING_DISCOVER_FLS");
      return true;
    }
    if (!schoolTour) {
      showError("Error: MISSING_SCHOOL_TOUR");
      return true;
    }
    if (!discoveryMethod) {
      showError("Error: MISSING_DISCOVERY_METHOD");
      return true;
    }
    if (referralOptions.includes(discoveryMethod)) {
      if (!referredBy || referredBy.trim() === '') {
        showError("Error: MISSING_REFERRED_BY");
        return true;
      }
    }
    if (discoveryMethod === 'Other') {
      if (!other || other.trim() === '') {
        showError("Error: MISSING_OTHER");
        return true;
      }
    }

    return false;
  }

  /////////////////////
  // ARCHIVE STUDENT //
  /////////////////////

  async function removeStudent() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }
    
    if (!saveFlag) {
      showError("Error: UNSAVED_CHANGES");
      return;
    }
    
    if (removeStudentErrorCheck()) {
        return;
    }

    // Get student data
    const studentNameSelectBox = document.getElementById('studentName');
    const selectedStudentID = studentNameSelectBox.value;
    const selectedStudent = STUDENT_DATA.find(student => student['Student ID'] === selectedStudentID);

    if (!selectedStudent) {
      showError("Error: MISSING_STUDENT_ENTRY");
      return;
    }

    // Show confirmation modal
    const warningIcon = '<i class="bi bi-exclamation-triangle-fill" style="color: var(--warning-color); margin-right: 10px;"></i>';
    const message = `Are you sure you want to archive the data for '${selectedStudent['Student Name']}'?`;
    const title = `${warningIcon}Archive Student`;
    const buttonText = await showAlertModal(title, message, "Cancel", "Archive");

    if (buttonText === "Cancel") {
      return;
    }

    // Set busy flag and create a backup of the student data
    busyFlag = true;
    const selectedIndex = studentNameSelectBox.selectedIndex;

    // Show progress toast
    showToast("", "Archiving student...", 5000);

    // Server operation
    google.script.run
      .withSuccessHandler(() => {
        // Update the UI
        if (selectedIndex >= 0) {
          studentNameSelectBox.remove(selectedIndex);
          studentNameSelectBox.selectedIndex = -1;
        }
            
        // Update the student status in the local data - CHANGE THIS!
        STUDENT_DATA.find(student => student['Student ID'] === selectedStudentID)['Status'] = 'Archive';
        updateStudentNames();
            
        const toastMessage = `'${selectedStudent['Student Name']}' archived successfully!`;
        showToast("", toastMessage, 5000);
        playNotificationSound("remove");
        busyFlag = false;
      })
      .withFailureHandler((error) => {
        const errorString = String(error);
        
        if (errorString.includes("401")) {
          sessionError();
        }
        else if (errorString.includes("permission")) {
            showError("Error: PERMISSION");
        }
        else {
          showError(error.message);
        }
        busyFlag = false;
      })
      .updateStudentStatus(selectedStudentID, 'Archive');
  }

  function removeStudentErrorCheck() {
    const studentNameSelectBox = document.getElementById('studentName');
    
    if (studentNameSelectBox.options.length === 0) {
      showError("Error: MISSING_STUDENT_DATA");
      return true;
    }

    return false;
  }

  ////////////////////
  // RENAME STUDENT //
  ////////////////////

  async function renameStudent() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }
    
    if (!saveFlag) {
      showError("Error: UNSAVED_CHANGES");
      return;
    }

    const studentNameSelectBox = document.getElementById('studentName');

    if (studentNameSelectBox.options.length === 0) {
      showError("Error: MISSING_STUDENT_DATA");
      return true;
    }

    // Get the selected student ID and data
    const selectedStudentID = studentNameSelectBox.value;
    const selectedStudent = STUDENT_DATA.find(student => student['Student ID'] === selectedStudentID);

    if (!selectedStudent) {
        showError("Error: MISSING_STUDENT_ENTRY");
        return;
    }

    // Store the current name
    const oldStudentName = selectedStudent['Student Name'];

    // Update modal with current name
    document.getElementById('currentStudentName').innerHTML = oldStudentName;

    // Show the rename modal
    showActionModal("renameStudentModal");
    const renameStudentModalButton = document.getElementById("renameStudentModalButton");
    
    renameStudentModalButton.onclick = async function() {
        busyFlag = true;

        if (renameStudentErrorCheck()) {
            busyFlag = false;
            return;
        }

        // Get new name/status data
        const firstName = document.getElementById('renameFirst').value;
        const lastName = document.getElementById('renameLast').value;
        const newStudentName = lastName + ", " + firstName;
        const studentStatus = selectedStudent['Status'];

        closeActionModal("renameStudentModal");
        
        // Show initial toast
        showToast("", "Renaming student...", 5000);

        // Save to Google Sheets
        google.script.run
          .withSuccessHandler(() => {
            selectedStudent['Student Name'] = newStudentName;
            updateStudentNames();
            
            // Switch to renamed student
            studentNameSelectBox.value = selectedStudentID;
            studentNameSelectBox.dispatchEvent(new Event('change'));
            
            showToast("", `${oldStudentName} renamed to ${newStudentName} successfully!`, 5000);
            playNotificationSound("success");
            busyFlag = false;
          })
          .withFailureHandler((error) => {
            const errorString = String(error);
        
            if (errorString.includes("401")) {
              sessionError();
            }
            else if (errorString.includes("permission")) {
            showError("Error: PERMISSION");
            }
            else {
              showError(error.message);
            }
            busyFlag = false;
          })
        .renameStudent(selectedStudentID, studentStatus, newStudentName);
    };
  }

  function renameStudentErrorCheck() {
    const firstNameInput = document.getElementById('renameFirst').value;
    const lastNameInput = document.getElementById('renameLast').value;
    
    if (!firstNameInput) {
      showError("Error: MISSING_FIRST_NAME");
      return true;
    }

    if (!lastNameInput) {
      showError("Error: MISSING_LAST_NAME");
      return true;
    }
    
    return false;
  }

  //////////////////////
  // ACTIVATE STUDENT //
  //////////////////////

  async function activateStudent() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }

    if (!saveFlag) {
      showError("Error: UNSAVED_CHANGES");
      return;
    }
    
    if (activateStudentErrorCheck()) {
      busyFlag = false;
      return;
    }

    // Get student data
    const studentNameSelectBox = document.getElementById('studentName');
    const selectedIndex = studentNameSelectBox.selectedIndex;

    if (selectedIndex < 0) {
        return;
    }

    const selectedStudentID = studentNameSelectBox.value;
    const selectedStudentName = studentNameSelectBox.options[selectedIndex].text;

    // Show confirmation modal with warning icon
    const warningIcon = '<i class="bi bi-exclamation-triangle-fill" style="color: var(--warning-color); margin-right: 10px;"></i>';
    const message = `Are you sure you want to activate the data for '${selectedStudentName}'?`;
    const title = `${warningIcon}Activate Student`;

    const buttonText = await showAlertModal(title, message, "Cancel", "Activate");

    if (buttonText === "Cancel") {
      return;
    }

    // Set busy flag and store backup
    busyFlag = true;

    // Show progress toast
    showToast("", "Activating student...", 5000);

    // Server operation
    google.script.run
      .withSuccessHandler(() => {
        STUDENT_DATA.find(student => student['Student ID'] === selectedStudentID)['Status'] = 'Active';
        updateStudentNames();

        playNotificationSound("success");
        showToast("", `'${selectedStudentName}' activated successfully!`, 5000);
        busyFlag = false;
      })
      .withFailureHandler((error) => {
        const errorString = String(error);
        
        if (errorString.includes("401")) {
          sessionError();
        }
        else if (errorString.includes("permission")) {
            showError("Error: PERMISSION");
        }
        else {
          showError(error.message);
        }
        busyFlag = false;
      })
    .updateStudentStatus(selectedStudentID, 'Active');
  }

  function activateStudentErrorCheck() {
    const studentNameSelectBox = document.getElementById('studentName');
    
    if (studentNameSelectBox.options.length === 0) {
      showError("Error: MISSING_STUDENT_DATA");
      return true;
    }

    return false;
  }

  ////////////////////
  // DELETE STUDENT //
  ////////////////////
  
  async function deleteStudent() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }
    
    if (!saveFlag) {
      showError("Error: UNSAVED_CHANGES");
      return;
    }

    if (deleteStudentErrorCheck()) {
      busyFlag = false;
      return;
    }

    // Get student data
    const studentNameSelectBox = document.getElementById('studentName');
    const selectedStudentID = studentNameSelectBox.value;
    const selectedStudent = STUDENT_DATA.find(student => student['Student ID'] === selectedStudentID);
    const selectedStudentName = selectedStudent['Student Name'];
    const selectedStudentStatus = selectedStudent['Status'];

    // Show confirmation modal with warning icon
    const warningIcon = '<i class="bi bi-exclamation-triangle-fill" style="color: var(--warning-color); margin-right: 10px;"></i>';
    const message = `Are you sure you want to delete the data for '${selectedStudentName}'? This action cannot be undone.`;
    const title = `${warningIcon}Delete Student`;

    const buttonText = await showAlertModal(title, message, "Cancel", "Delete");

    if (buttonText === "Cancel") {
      return;
    }

    // Set busy flag and store backup
    busyFlag = true;
    const selectedIndex = studentNameSelectBox.selectedIndex;

    // Show progress toast
    showToast("", "Deleting student...", 5000);

    // Server operation
    google.script.run
      .withSuccessHandler(() => {
        if (selectedIndex >= 0) {
          studentNameSelectBox.remove(selectedIndex);
          studentNameSelectBox.selectedIndex = -1;
        }

        // Remove student with the selected ID from STUDENT_DATA
        STUDENT_DATA = STUDENT_DATA.filter(student => student['Student ID'] !== selectedStudentID);

        updateStudentNames();
                  
        const toastMessage = `'${selectedStudentName}' deleted successfully!`;
        playNotificationSound("remove");
        showToast("", toastMessage, 5000);
        busyFlag = false;
      })
      .withFailureHandler((error) => {
        const errorString = String(error);
        
        if (errorString.includes("401")) {
          sessionError();
        }
        else if (errorString.includes("permission")) {
            showError("Error: PERMISSION");
        }
        else {
          showError(error.message);
        }
        busyFlag = false;
      })
    .deleteStudentData(selectedStudentID, selectedStudentStatus);
  }

  function deleteStudentErrorCheck() {
    const studentNameSelectBox = document.getElementById('studentName');
    
    if (studentNameSelectBox.options.length === 0) {
      showError("Error: MISSING_STUDENT_DATA");
      return true;
    }

    return false;
  }

  ///////////////////
  // COMPOSE EMAIL //
  ///////////////////

  async function composeEmail() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }
    
    if (!saveFlag) {
      showError("Error: UNSAVED_CHANGES");
      return;
    }
    
    // Prevent add email modal from being shown if no student selected
    const studentID = document.getElementById('studentName').value;

    if (!studentID) {
      showError("Error: MISSING_STUDENT_DATA");
      return;
    }
    
    // Reset the warning before the modal is opened
    document.getElementById('templateWarning').style.display = 'none';
    showActionModal("composeEmailModal");

    const composeEmailModalButton = document.getElementById('composeEmailModalButton');
    composeEmailModalButton.onclick = async function() {
      busyFlag = true;
        
      if (sendEmailErrorCheck()) {
        busyFlag = false;
        return;
      }

      const template = document.getElementById('templateSelect').value;
      const recipient = document.getElementById('emailRecipient').value;
      const subject = document.getElementById('emailSubject').value;
      const body = document.getElementById('emailBody').innerHTML;
      let attachments = [];

      closeActionModal("composeEmailModal");

      try {
        const toastMessage = template === "acceptance" || template === "acceptanceConditional"
          ? "Attaching enrollment packet and sending email..." 
          : "Sending email...";
        const toastDuration = template === "acceptance" || template === "acceptanceConditional" ? 10000 : 5000;
        
        showToast("", toastMessage, toastDuration);

        if (template === "acceptance" || template === "acceptanceConditional") {
          attachments = await generateEnrollmentPacket();
        }

        google.script.run
          .withSuccessHandler(() => {
            playNotificationSound("email");
            showToast("", "Email successfully sent to: " + recipient, 10000);
            busyFlag = false;
          })
          .withFailureHandler((error) => {
            const errorString = String(error);
        
            if (errorString.includes("401")) {
              sessionError();
            } else {
              showError(error.message);
            }

            busyFlag = false;
          })
        .createEmail(recipient, subject, body, attachments);
      } catch (error) {
        showError(error.message);
        //showError("Error: EMAIL_FAILURE");
        busyFlag = false;
      }
    };
  }

  async function generateEnrollmentPacket() {
    // Get the document definitions for each PDF
    const page1 = createAdmissionContract();
    const page2 = createTuitionPaymentOptions();
    const page3 = createMedicalConsentToTreat();
    const page4 = createStudentEmergencyContacts();
    const page5 = createTechnologyUseConsent();
    const page6 = createBlackbaudTuitionInformation();
          
    // Concatenate the document definitions into one, adding page breaks
    const packetContent = [].concat(
      page1.content, { text: '', pageBreak: 'after' }, 
      page2.content, { text: '', pageBreak: 'after' }, 
      page3.content, { text: '', pageBreak: 'after' }, 
      page4.content, { text: '', pageBreak: 'after' }, 
      page5.content, { text: '', pageBreak: 'after' }, 
      page6.content
    );

    // Use 'page1' to define other sections/styles since they are the same across all document pages
    const docDefinition = {
      pageSize: page1.pageSize,
      pageOrientation: page1.pageOrientation,
      pageMargins: page1.pageMargins,
      header: page1.header,
      footer: page1.footer,
      content: packetContent,
      defaultStyle: page1.defaultStyle,
      styles: page1.styles,
      images: page1.images
    };

    // Use async/await for PDF generation and sending the email
    return new Promise((resolve, reject) => {
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        blob.arrayBuffer()
          .then(arrayBuffer => {
            const uint8Array = new Uint8Array(arrayBuffer);
            const byteArray = Array.from(uint8Array);
            resolve(byteArray);
          })
          .catch(reject);
      });
    });
  }  

  function getEmailTemplate() {
    // Get references to the selectbox and text areas
    const mergeData = getMergeData();
    const templateType = document.getElementById('templateSelect').value;
    const templateWarning = document.getElementById('templateWarning');
    const parentGuardianEmail = document.getElementById('parentGuardianEmail').value;
    const currentTeacherEmail = document.getElementById('currentTeacherEmail').value;
    const recipient = document.getElementById('emailRecipient');
    const subjectTemplate = document.getElementById('emailSubject');
    const bodyTemplate = document.getElementById('emailBody');
    
    // Reset template warning and scroll position
    document.getElementById('templateWarning').style.display = 'none';
    bodyTemplate.scrollTop = 0;

    // Extract email templates from APP_SETTINGS
    const emailTemplates = APP_SETTINGS.emailTemplateSettings;

    // Helper function to find a template by type (e.g., 'Initial', 'Reminder')
    const getTemplate = (type) => emailTemplates[type] || { subject: '', body: '' };

    // Update the template content based on the selected option
    switch (templateType) {
      case 'waitlist':
        const waitlistTemplate = getTemplate('waitlist');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = waitlistTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(waitlistTemplate.body, mergeData);
        break;

      case 'evaluation':
        const evaluationTemplate = getTemplate('evaluation');
        recipient.value = currentTeacherEmail;
        subjectTemplate.value = evaluationTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(evaluationTemplate.body, mergeData);
        break;

      case 'screeningEEC':      
        const screeningEECTemplate = getTemplate('screeningEEC');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = screeningEECTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(screeningEECTemplate.body, mergeData);
        break;

      case 'screeningSchool':      
        const screeningSchoolTemplate = getTemplate('screeningSchool');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = screeningSchoolTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(screeningSchoolTemplate.body, mergeData);
        break;

      case 'acceptance':
        const acceptanceTemplate = getTemplate('acceptance');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = acceptanceTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(acceptanceTemplate.body, mergeData);
        break;
      
      case 'acceptanceConditional':
        const acceptanceConditionalTemplate = getTemplate('acceptanceConditional');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = acceptanceConditionalTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(acceptanceConditionalTemplate.body, mergeData);
        break;
      
      case 'rejection':
        const rejectionTemplate = getTemplate('rejection');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = rejectionTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(rejectionTemplate.body, mergeData);
        break;
      
      case 'completion':
        const completionTemplate = getTemplate('completion');
        recipient.value = parentGuardianEmail;
        subjectTemplate.value = completionTemplate.subject;
        bodyTemplate.innerHTML = getEmailBody(completionTemplate.body, mergeData);
        break;

      default:
        recipient.value = "";
        subjectTemplate.value = "";
        bodyTemplate.innerHTML = "";
        break;
    }
  }

  function getEmailBody(message, mergeData) {
    // Regular expression to match text within curly braces
    const regex = /{{([^}]+)}}/g;
    const warningIcon = '<i class="bi-exclamation-triangle-fill" style="color: var(--warning-color)"></i>';

    // Use replace() to find and replace text within curly braces
    const bodyTemplate = message.replace(regex, (match, variableName) => {
      
      // Check if the variable exists in the provided mapping
      if (mergeData.hasOwnProperty(variableName)) {
        // Replace the variable with its corresponding value
        return mergeData[variableName];
      }
      else {
        // If the variable is not found, leave it unchanged
        return match;
      }
    });

    if (bodyTemplate.includes(warningIcon)) {
      document.getElementById('templateWarning').style.display = '';
    }

    return bodyTemplate;
  }

  function getMergeData() {
    // Split the student name into first and last
    const studentSelect = document.getElementById('studentName');
    const studentName = studentSelect.options[studentSelect.selectedIndex].text;
    let nameParts = studentName.match(/(.+),\s*(.+)/);
    let studentLastName = nameParts[1].trim();
    let studentFirstName = nameParts[2].trim();

    // Set the screening type and fee based on grade level
    const incomingGrade = document.getElementById('incomingGrade').value;
    const enrolledInEEC = document.getElementById('enrolledInEEC').value;
    const developmentalScreeningFeeEEC = APP_SETTINGS.feeSettings.developmentalScreeningEECFee;
    const developmentalScreeningFeeTKK = APP_SETTINGS.feeSettings.developmentalScreeningSchoolFee;
    const academicScreeningFee = APP_SETTINGS.feeSettings.academicScreeningFee;
    let screeningType;
    let screeningFee;

    if (!incomingGrade) {
      screeningType = "";
      screeningFee = "";
    }
    else if (incomingGrade === "Transitional Kindergarten" || incomingGrade === "Kindergarten") {
      screeningType = "Developmental Screening";
      if (!enrolledInEEC) {
        screeningFee = "";
      }
      else if (enrolledInEEC === "Yes") {
        screeningFee = developmentalScreeningFeeEEC;
      }
      else if (enrolledInEEC === "No") {
        screeningFee = developmentalScreeningFeeTKK;
      }
    }
    else {
      screeningType = "Academic Screening";
      screeningFee = academicScreeningFee;
    }

    // Format evaluationDueDate
    const evaluationDueDate = document.getElementById('evaluationDueDate').value;
    const formattedEvaluationDueDate = formatDate(evaluationDueDate);

    // Format screeningDate
    const screeningDate = document.getElementById('screeningDate').value;
    const formattedScreeningDate = formatDate(screeningDate);

    // Format screeningTime
    const screeningTime = document.getElementById('screeningTime').value;
    const formattedScreeningTime = formatTime(screeningTime);

    // Format acceptanceDate
    const acceptanceDueDate = document.getElementById('acceptanceDueDate').value;
    const formattedAcceptanceDueDate = formatDate(acceptanceDueDate);

    // Create the mergeData object
    mergeData = {
      schoolYear: APP_SETTINGS.schoolSettings.schoolYear,
      lastName: studentLastName,
      firstName: studentFirstName,
      gradeLevel: incomingGrade,
      teacherName: document.getElementById('currentTeacherName').value,
      evaluationDueDate: formattedEvaluationDueDate,
      screeningType: screeningType, 
      screeningFee: screeningFee,
      screeningDate: formattedScreeningDate,
      screeningTime: formattedScreeningTime,
      acceptanceDueDate: formattedAcceptanceDueDate
    };

    const warningIcon = '<i class="bi-exclamation-triangle-fill" style="color: var(--warning-color)"></i>';

    // Add error icon to missing mergeData data
    Object.keys(mergeData).forEach(key => {
      if (mergeData[key] === "") {
        mergeData[key] = warningIcon;
      }
    });

    return mergeData;
  }

  function sendEmailErrorCheck() {
    const recipient = document.getElementById('emailRecipient').value;
    const body = document.getElementById('emailBody').innerHTML;
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9-]{2,})+$/;

    const warningIcon = '<i class="bi-exclamation-triangle-fill" style="color: var(--warning-color)"></i>';
    
    if (!recipient) {
      showError("Error: MISSING_RECIPIENT");
      return true;
    }

    const recipients = recipient.split(',');
    for (let i = 0; i < recipients.length; i++) {
      if (!emailPattern.test(recipients[i].trim())) {
        showError("Error: INVALID_EMAIL");
        return true;
      }
    }

    if (body.includes(warningIcon)) {
      showError("Error: MISSING_TEMPLATE_DATA");
      return true;
    }

    return false;
  }

  //////////////////
  // EXPORT FORMS //
  //////////////////

  function exportForms() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }

    showActionModal("exportFormsModal");
    const exportFormsModalButton = document.getElementById('exportFormsModalButton');

    exportFormsModalButton.onclick = function () {
      busyFlag = true;
      const formType = document.getElementById('formSelect').value;

      closeActionModal("exportFormsModal");
      showToast("", "Exporting form...", 5000);

      setTimeout(() => {
        let docDefinition, filename;

        switch (formType) {
          case 'Admission Contract':
            docDefinition = createAdmissionContract();
            filename = 'Admission Contract.pdf';
            break;
          case 'Tuition Payment Options':
            docDefinition = createTuitionPaymentOptions();
            filename = 'Tuition Payment Options.pdf';
            break;
          case 'Medical Consent To Treat':
            docDefinition = createMedicalConsentToTreat();
            filename = 'Medical Consent To Treat.pdf';
            break;
          case 'Student Emergency Contacts':
            docDefinition = createStudentEmergencyContacts();
            filename = 'Student Emergency Contacts.pdf';
            break;
          case 'Technology Consent':
            docDefinition = createTechnologyUseConsent();
            filename = 'Technology Consent.pdf';
            break;
          case 'Blackbaud Tuition Information':
            docDefinition = createBlackbaudTuitionInformation();
            filename = 'Blackbaud Tuition Information.pdf';
            break;
        }

        const pdfDoc = pdfMake.createPdf(docDefinition);

        pdfDoc.download(filename, () => {
          // Callback runs *after* download is triggered
          busyFlag = false;
          playNotificationSound("success");
          showToast("", "Form exported successfully!", 5000);
        });
      }, 100);
    };
  }

  /////////////////
  // EXPORT DATA //
  /////////////////

  function exportData() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      return;
    }
    
    showActionModal("exportDataModal");
    const exportDataModalButton = document.getElementById('exportDataModalButton');
    
    exportDataModalButton.onclick = function() {
      busyFlag = true;

      showToast("", "Exporting data...", 5000);
    
      const fileType = document.getElementById('fileTypeSelect').value;
      const fileName = 'Student Enrollment Data - ' + APP_SETTINGS.schoolSettings.schoolYear;
      
      switch (fileType) {
        case 'csv':
          google.script.run
            .withSuccessHandler(function(data) {
              let a = document.createElement('a');
              
              a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(data);
              a.download = fileName + '.csv';
              a.click();
              busyFlag = false;
              playNotificationSound("success");
              showToast("", "Data exported successfully!", 5000);
            })
            .withFailureHandler((error) => {
              const errorString = String(error);
        
              if (errorString.includes("401")) {
                sessionError();
              } else {
                showError(error.message);
              }
              busyFlag = false;
            })
          .getCsv();
        break;
        
        case 'xlsx':
          google.script.run
            .withSuccessHandler(function(data) {
              // Convert the raw data into a Uint8Array
              const uint8Array = new Uint8Array(data);
                      
              // Create a Blob from the binary data
              const blob = new Blob([uint8Array], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
              
              const url = URL.createObjectURL(blob);
              let a = document.createElement('a');
              a.href = url;
              a.download = fileName + '.xlsx';
              a.click();
              URL.revokeObjectURL(url);
              busyFlag = false;
              playNotificationSound("success");
              showToast("", "Data exported successfully!", 5000);
            })
            .withFailureHandler((error) => {
              const errorString = String(error);
        
              if (errorString.includes("401")) {
                sessionError();
              } else {
                showError(error.message);
              }
              busyFlag = false;
            })
          .getXlsx();
        break;
      }
      
      closeActionModal("exportDataModal");
    };
  }

  ///////////////////////
  // UTILITY FUNCTIONS //
  ///////////////////////

  function updateStudentNames() {
    const toggleDataButton = document.getElementById('toggleDataButton');
    const dataFilter = parseInt(toggleDataButton.getAttribute('data-state'), 10);
    const studentNameSelectBox = document.getElementById('studentName');
    studentNameSelectBox.innerHTML = ''; // Reset selectbox options
    
    // Filter the student data by STUDENT_DATA['Status']
    let filteredStudentData = STUDENT_DATA;

    if (dataFilter === 0) {
      filteredStudentData = STUDENT_DATA.filter(item => item['Status'] === 'Active');
    } else if (dataFilter === 1) {
      filteredStudentData = STUDENT_DATA.filter(item => item['Status'] === 'Archive');
    }

    // Sort the student data
    const sortedStudentData = filteredStudentData.sort(function(a, b) {
      return a['Student Name'].localeCompare(b['Student Name']);
    });
    
    sortedStudentData.forEach(function(item) {
      let option = document.createElement('option');
      option.text = item['Student Name'];
      option.value = item['Student ID'];
      studentNameSelectBox.add(option);
    });

    // Check if there are students to display
    if (sortedStudentData.length === 0) {
        console.log("WARNING: No student data found for the selected filter.");
        document.getElementById('profileDataTable').style.display = 'none';
        document.getElementById('profileWarning').style.display = '';
        document.getElementById('enrollmentDataTable').style.display = 'none';
        document.getElementById('enrollmentWarning').style.display = '';
    } else {
        document.getElementById('profileDataTable').style.display = '';
        document.getElementById('profileWarning').style.display = 'none';
        document.getElementById('enrollmentDataTable').style.display = '';
        document.getElementById('enrollmentWarning').style.display = 'none';

        // If there are students, set the first one as selected by default
        studentNameSelectBox.value = sortedStudentData[0]['Student ID']; // Default to first student
        studentNameSelectBox.dispatchEvent(new Event('change')); // Trigger 'change' event
    }

    // Clear student data if no options
    if (studentNameSelectBox.options.length === 0) {
        updateStudentData();
    }
  }
  
  // Update student profile fields
  function updateStudentData(selectedStudentID) {
    const clearAll = !selectedStudentID || selectedStudentID === "";

    let student = clearAll ? {} : STUDENT_DATA.find(function(item) {
      return item['Student ID'] === selectedStudentID;
    });

    // Populate static fields
    Object.keys(STUDENT_KEY_MAPPINGS).forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = clearAll || !student || student[STUDENT_KEY_MAPPINGS[id]] === undefined 
          ? "" 
          : student[STUDENT_KEY_MAPPINGS[id]];
      }
    });

    // Populate dynamic rows
    const discoveryMethodSelect = document.getElementById('discoveryMethod');
    if (discoveryMethodSelect) {
      const method = student ? student['Discovery Method'] : '';
      discoveryMethodSelect.value = method || "";

      discoveryMethodSelect.dispatchEvent(new Event('change'));

      const referralOptions = [
        'Referred by EEC/school family',
        'Referred by employee',
        'Referred by alumni',
        'Referred by community partner'
      ];

      let dynamicInputId = null;
      if (referralOptions.includes(method)) {
        dynamicInputId = 'referredBy';
      } else if (method === 'Other') {
        dynamicInputId = 'other';
      }

      if (dynamicInputId) {
        const dynamicInput = document.getElementById(dynamicInputId);
        if (dynamicInput) {
          dynamicInput.value = student ? student[dynamicInputId === 'referredBy' ? 'Referred By' : 'Other'] || '' : '';
          dynamicInput.style.backgroundColor = getColor(dynamicInput);
        }
      }
    }

    updateColors();

    const saveChangesButton = document.getElementById('saveChangesButton');
    saveChangesButton.classList.remove('tool-bar-button-unsaved');
    saveFlag = true;
    previousStudentID = selectedStudentID;
  }

  async function getAvailableId() {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => {
          const errorString = String(error);
                
          if (errorString.includes("401")) {
            sessionError();
          } else {
            showError("Error: ID_FAILURE");
          }
          busyFlag = false;
          reject(error);  // Reject the promise so the error propagates
        })
      .getId();
    });
  }

  function saveAlert() {
    saveFlag = false;
    saveChangesButton.classList.add('tool-bar-button-unsaved');
  }

  ////////////////////
  // ERROR HANDLING //
  ////////////////////

  function showError(errorType, callback = "") {
    const warningIcon = `<i class="bi bi-exclamation-triangle-fill" style="color: var(--warning-color); margin-right: 10px;"></i>`;
    const errorIcon = `<i class="bi bi-x-circle-fill" style="color: var(--error-color); margin-right: 10px;"></i>`;
    let title;
    let message;
    let button1;
    let button2;

    switch (errorType) {
      case "Error: OPERATION_IN_PROGRESS":
        title = warningIcon + "Operation In Progress";
        message = "Please wait until the operation completes and try again.";
        button1 = "Close";
        break;
      
      // Save errors
      case "Error: UNSAVED_CHANGES":
        title = warningIcon + "Unsaved Changes";
        message = "There are unsaved changes. Please save the changes and try again.";
        button1 = "Close";
        break;
      
      // Add student errors
      case "Error: MISSING_FIRST_NAME":
        title = warningIcon + "Missing First Name";
        message = "Please enter a first name and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_LAST_NAME":
        title = warningIcon + "Missing Last Name";
        message = "Please enter a last name and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_GENDER":
        title = warningIcon + "Missing Gender";
        message = "Please select a gender and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_DOB":
        title = warningIcon + "Missing Date Of Birth";
        message = "Please enter a date of birth and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_INCOMING_GRADE":
        title = warningIcon + "Missing Incoming Grade";
        message = "Please select an incoming grade and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_GRADE_STATUS":
        title = warningIcon + "Missing Grade Status";
        message = "Please select a grade status and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_ENROLLMENT_MANAGER":
        title = warningIcon + "Missing Enrollment Manager";
        message = "Please select an enrollment manager and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_PARENT_GUARDIAN_NAME":
        title = warningIcon + "Missing Name";
        message = "Please enter a parent/guardian name and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_PARENT_GUARDIAN_PHONE":
        title = warningIcon + "Missing Phone Number";
        message = "Please enter a parent/guardian phone number and try again.";
        button1 = "Close";
        break;

      case "Error: INVALID_PHONE":
        title = warningIcon + "Invalid Phone Number";
        message = "Please check the parent/guardian phone number and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_PARENT_GUARDIAN_EMAIL":
        title = warningIcon + "Missing Email Address";
        message = "Please enter a parent/guardian email address and try again.";
        button1 = "Close";
        break;

      case "Error: INVALID_PARENT_GUARDIAN_EMAIL":
        title = warningIcon + "Invalid Email Address";
        message = "Please check the parent/guardian email address and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_CURRENT_SCHOOL_NAME":
        title = warningIcon + "Missing School Name";
        message = "Please enter a current school name and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_CURRENT_TEACHER_NAME":
        title = warningIcon + "Missing Teacher Name";
        message = "Please enter a current teacher name and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_CURRENT_TEACHER_EMAIL":
        title = warningIcon + "Missing Email Address";
        message = "Please enter a current teacher email address and try again.";
        button1 = "Close";
        break;

      case "Error: INVALID_CURRENT_TEACHER_EMAIL":
        title = warningIcon + "Invalid Email Address";
        message = "Please check the current teacher email address and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_EEC_STATUS":
        title = warningIcon + "Missing EEC Status";
        message = "Please select the EEC enrollment status and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_DISCOVER_FLS":
        title = warningIcon + "Missing Attendee Status";
        message = 'Please select the "Disover FLS" attendee status and try again.';
        button1 = "Close";
        break;
      
      case "Error: MISSING_SCHOOL_TOUR":
        title = warningIcon + "Missing Attendee Status";
        message = "Please select the school tour attendee status and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_DISCOVERY_METHOD":
        title = warningIcon + "Missing Discovery Method";
        message = "Please select the discovery method and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_REFERRED_BY":
        title = warningIcon + "Missing Referral Name";
        message = "Please enter a referral name and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_OTHER":
        title = warningIcon + "Missing Other Information";
        message = "Please enter the other information and try again.";
        button1 = "Close";
        break;
      
      // Database errors
      case "Error: MISSING_STUDENT_DATA":
        title = errorIcon + "Data Error";
        message = "No student data found. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: MISSING_MEETING_DATA":
        title = errorIcon + "Data Error";
        message = "No meeting data found. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: MISSING_STUDENT_ENTRY":
        title = errorIcon + "Data Error";
        message = "The student data could not be found in the database. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: MISSING_MEETING_ENTRY":
        title = errorIcon + "Data Error";
        message = "The meeting data could not be found in the database. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: DUPLICATE_ENTRY":
        title = errorIcon + "Data Error";
        message = "Duplicate data was found in the database. The operation could not be completed.";
        button1 = "Close";
        break;

      // Email errors
      case "Error: MISSING_RECIPIENT":
        title = warningIcon + "Missing Email Recipient";
        message = "Please enter an email address and try again.";
        button1 = "Close";
        break;
      
      case "Error: INVALID_EMAIL":
        title = warningIcon + "Invalid Email Address";
        message = "Please check the email address and try again.";
        button1 = "Close";
        break;

      case "Error: MISSING_TEMPLATE_DATA":
        title = errorIcon + "Email Error";
        message = "Missing email template data. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: QUOTA_LIMIT":
        title = errorIcon + "Email Error";
        message = "The daily email limit has been reached. Please wait 24 hours before sending your email and try again.";
        button1 = "Close";
        break;
      
      // Backup errors
      case "backupFailure":
        title = errorIcon + "Backup Error";
        message = "An unknown error occurred. The operation could not be completed.";
        button1 = "Close";
        break;

      // Unknown errors
      case "Error: EMAIL_FAILURE":
        title = errorIcon + "Email Error";
        message = "An unknown email error occurred. The operation could not be completed.";
        button1 = "Close";
        break;
      
      case "Error: EXPORT_FAILURE":
        title = errorIcon + "Export Error";
        message = "An unknown error occurred while exporting data. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: ID_FAILURE":
        title = errorIcon + "ID Error";
        message = "An unknown error occurred while fetching ID's. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: DATABASE_FAILURE":
        title = errorIcon + "Database Error";
        message = "An unknown error occurred while connecting with the database. The operation could not be completed.";
        button1 = "Close";
        break;

      case "Error: PERMISSION":
        title = errorIcon + "Permission Error";
        message = "You do not have permission to modify the database. Please contact your administrator. The operation could not be completed.";
        button1 = "Close";
        break;

      default:
        title = errorIcon + "Error";
        message = errorType;
        button1 = "Close";
        break;
    }
    
    playNotificationSound("alert");
    showAlertModal(title, message, button1, button2);
  }

  async function sessionError() {
    const errorIcon = `<i class="bi bi-x-circle-fill" style="color: var(--error-color); margin-right: 10px;"></i>`;
    const title = `${errorIcon}Session Expired`;
    const message = "The current session has expired. Please sign in with Google and try again.";
    
    playNotificationSound("alert");
    const buttonText = await showAlertModal(title, message, "Cancel", "Sign in");
       
    if (buttonText === "Sign in") {
      const signInUrl = "https://accounts.google.com";
      const signInTab = window.open(signInUrl, "_blank");
    }
  }

  /////////////////////
  // DATA VALIDATION //
  /////////////////////

  // Function to format phone number inputs
  function formatPhoneNumber(input) {
    // Remove all non-digit characters from the input value
    let inputValue = input.value.replace(/\D/g, "");

    // Limit the input value to 10 digits
    inputValue = inputValue.slice(0, 10);

    // Format the input value as '(XXX) XXX-XXXX'
    let formattedValue = '';
    for (let i = 0; i < inputValue.length; i++) {
      if (i === 0) {
        formattedValue += '(';
      } else if (i === 3) {
        formattedValue += ') ';
      } else if (i === 6) {
        formattedValue += '-';
      }
      formattedValue += inputValue[i];
    }

    // Update the input value with the formatted value
    input.value = formattedValue;
  }

  // Function to format date
  function formatDate(dateString) {
    if (!dateString) {
      return '';
    } else {
      // Split the date string into components
      const [year, month, day] = dateString.split('-').map(Number);

      // Create a date object using the local time zone
      const date = new Date(year, month - 1, day);

      // Format the date as 'MM/DD/YYYY'
      const options = { month: 'numeric', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  }

  // Function to format time
  function formatTime(timeString) {
    if (!timeString) {
      return '';
    } else {
      let hours = parseInt(timeString.split(':')[0]);
      let minutes = timeString.split(':')[1];
      let amPm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert hours to 12-hour format
      return `${hours}:${minutes} ${amPm}`;
    }
  }

  function updateColors() {
    const selectColorElements = document.querySelectorAll('#gender, #dateOfBirth, #incomingGrade, #gradeStatus, #enrollmentManager, #enrolledInEEC, #discoverFLS, #schoolTour, #discoveryMethod, #evaluationDueDate, #evaluationEmail, #evaluationForm, #contactedToSchedule, #screeningDate, #screeningTime, #screeningEmail, #reportCard, #iepDocumentation, #screeningFee, #adminSubmissionDate, #adminAcceptance, #acceptanceDueDate, #acceptanceEmail, #familyAcceptance, #blackbaudAccount, #birthCertificatePassport, #immunizationRecords, #admissionContractForm, #tuitionPaymentForm, #medicalConsentForm, #emergencyContactsForm, #techConsentForm, #registrationFee');
    const inputColorElements = document.querySelectorAll('#parentGuardianName, #parentGuardianPhone, #parentGuardianEmail, #currentSchoolName, #currentTeacherName, #currentTeacherEmail, #referredBy, #other');
    const noColorElements = document.querySelectorAll('#notes');

    selectColorElements.forEach(element => {
      element.style.backgroundColor = getColor(element);
    });
    
    inputColorElements.forEach(element => {
      element.style.backgroundColor = getColor(element);
    });
  }

  // Get select box/input box color based on value
  function getColor(element) {
    const value = element.value.trim(); // Trim to remove extra spaces

    if (!value) { // Checks for "", null, undefined, 0, etc.
      return '';
    }

    // Define patterns for phone and email validation
    const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9-]{2,})+$/;


    // Validation for phone numbers
    if (element.id === 'parentGuardianPhone') {
        if (!phonePattern.test(value)) {
            return ''; // No color if phone format is invalid
        }
        return 'var(--green)'; // Valid phone numbers get green
    }

    // Validation for emails
    if (element.id === 'parentGuardianEmail' || element.id === 'currentTeacherEmail') {
        if (!emailPattern.test(value)) {
            return ''; // No color if email format is invalid
        }
        return 'var(--green)'; // Valid email addresses get green
    }

    // If the element is an input field but not a phone/email, restrict the color to green
    if (element.tagName === 'INPUT') {
        return 'var(--green)';
    }

    // Check for specific values
    switch (value) {
      case "Male":
        return 'var(--blue)';
      
      case "Female":
        return 'var(--pink)';
      
      case "Non-binary":
        return 'var(--gray)';
      
      case "Requested":
      case "In Progress":
      case "Pending":
      case "In Review":
        return 'var(--orange)';
      
      case "Waitlist":
      case "No":
      case "Rejected":
        return 'var(--red)';

      case "N/A":
      case "Non-binary":
        return 'var(--gray)';
      
      default:
        // Default color for non-specified cases
        return 'var(--green)';
    }
  }
  
</script>
