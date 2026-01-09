<script type="text/javascript">
  // Global variables  
  let APP_SETTINGS;
  let EMAIL_TEMPLATE_DATA;
  
  // Global flags
  let saveFlag = true; // True if all changes saved, false if unsaved changes
  let busyFlag = false; // True if operation in progress, false if no operation in progress
  
  // Initialize application
  // Conversion to async allows for parallel data retrieval from Apps Script
  window.onload = async function() {
    console.log("Initializing settings...");

    const toolbar = document.getElementById('toolbar');
    const page = document.getElementById('page');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    try {
      // Fetch data in parallel (async not needed but allows for future data streams)
      const [appSettings] = await Promise.all([
        new Promise((resolve, reject) => {
          google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getAppSettings();
        })
      ]);

      // Set global variables
      APP_SETTINGS = appSettings;

      // Populate elements with data
      await Promise.all([
        loadSettings()
      ]);

      setEventListeners();
          
      console.log("Initialization complete!");
    
    } catch (error) {
        console.error("Error during initialization: ", error);
    
    } finally {
      // Hide loading indicator and show page
      loadingIndicator.style.display = 'none';
      toolbar.style.display = 'block';
      page.style.display = 'flex';
    }
  };

  function setEventListeners() {
    console.log("Setting event listeners...");

    const allTextInputs = document.querySelectorAll('.table-input[type=text]');
    const allSelects = document.querySelectorAll('.table-select, #theme');
    const allCurrencyInputs = document.querySelectorAll('.table-input[data-type="currency"]');
    const saveChangesButton = document.getElementById('saveChangesButton');
    const themeSelect = document.getElementById('theme');
    const alertSoundSelect = document.getElementById('alertSound');
    const emailSoundSelect = document.getElementById('emailSound');
    const successSoundSelect = document.getElementById('successSound');
    const removeSoundSelect = document.getElementById('removeSound');
    
    window.addEventListener('beforeunload', function (e) {
      if (!saveFlag) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    allTextInputs.forEach(input => {
      input.addEventListener('input', saveAlert);
    });

    allSelects.forEach(select => {
      select.addEventListener('change', saveAlert);
    });

    allCurrencyInputs.forEach(input => {
      input.addEventListener('input', saveAlert);
      input.addEventListener('input', function(event) {
        formatCurrency(this);
      });
    });

    themeSelect.addEventListener('change', function() {
      const theme = document.getElementById('theme').value;
      const customTheme = document.getElementById('customTheme');

      if (theme === "custom") {
        customTheme.style.display = 'block';
      } else {
        customTheme.style.display = 'none';
      }
    });

    alertSoundSelect.addEventListener('change', function() {
      USER_SETTINGS.alertSound = alertSoundSelect.value;
      playNotificationSound("alert");
    });

    emailSoundSelect.addEventListener('change', function() {
      USER_SETTINGS.emailSound = emailSoundSelect.value;
      playNotificationSound("email");
    });

    successSoundSelect.addEventListener('change', function() {
      USER_SETTINGS.successSound = successSoundSelect.value;
      playNotificationSound("success");
    });

    removeSoundSelect.addEventListener('change', function() {
      USER_SETTINGS.removeSound = removeSound.value;
      playNotificationSound("remove");
    });

    document.getElementById('silentModeSwitch').addEventListener('change', function() {
      USER_SETTINGS.silentMode = this.checked ? 'true' : 'false';
      saveAlert();
    });
    
    document.getElementById('templateSubject').addEventListener('input', saveAlert);
    document.getElementById('templateBody').addEventListener('input', saveAlert);

    saveChangesButton.addEventListener('click', saveSettings);

    console.log("Complete!");
  }

  ///////////////////
  // LOAD SETTINGS //
  ///////////////////

  function loadSettings() {
    console.log("Loading settings...");

    // Appearance
    setColorPicker();
    const themeSelect = document.getElementById('theme');
    const customTheme = document.getElementById('customTheme');
    themeSelect.value = USER_SETTINGS.theme;

    if (USER_SETTINGS.theme === "custom") {
      customTheme.style.display = 'block';
    } else {
      customTheme.style.display = 'none';
    }

    // Sound Effects
    const silentMode = USER_SETTINGS.silentMode === 'true'; // Convert string to boolean
    document.getElementById('alertSound').value = USER_SETTINGS.alertSound;
    document.getElementById('emailSound').value = USER_SETTINGS.emailSound;
    document.getElementById('removeSound').value = USER_SETTINGS.removeSound;
    document.getElementById('successSound').value = USER_SETTINGS.successSound;
    document.getElementById('silentModeSwitch').checked = silentMode; // Use boolean to set switch state
    
    //School Information
    document.getElementById('schoolName').value = APP_SETTINGS.schoolSettings.schoolName || '';
    document.getElementById('schoolYear').value = APP_SETTINGS.schoolSettings.schoolYear || '';
    
    //School Fees
    document.getElementById('registrationFee').value = APP_SETTINGS.feeSettings.registrationFee || '';
    document.getElementById('registrationFeeEEC').value = APP_SETTINGS.feeSettings.registrationFeeEEC || '';
    document.getElementById('hugFee').value = APP_SETTINGS.feeSettings.hugFee || '';
    document.getElementById('familyCommitmentFee').value = APP_SETTINGS.feeSettings.familyCommitmentFee || '';
    document.getElementById('flashFee').value = APP_SETTINGS.feeSettings.flashFee || '';
    document.getElementById('withdrawalFee').value = APP_SETTINGS.feeSettings.withdrawalFee || '';

    console.log(APP_SETTINGS.emailTemplateSettings);
    loadEmailTemplateSettings(APP_SETTINGS.emailTemplateSettings);

    console.log("Complete!");
  }

  function setColorPicker() {
    const themeTypeSelect = document.getElementById('themeTypeSelect');
    const primaryColorPicker = document.getElementById('primaryColorPicker');
    const accentColorPicker = document.getElementById('accentColorPicker');

    themeTypeSelect.value = getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim();
    primaryColorPicker.value = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    accentColorPicker.value = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
  }

  function loadEmailTemplateSettings(emailTemplateSettings) {
    EMAIL_TEMPLATE_SETTINGS = {
      waitlist: {
        subject: emailTemplateSettings.waitlist.subject || '',
        body: emailTemplateSettings.waitlist.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      evaluation: {
        subject: emailTemplateSettings.evaluation.subject || '',
        body: emailTemplateSettings.evaluation.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      screeningEEC: {
        subject: emailTemplateSettings.screeningEEC.subject || '',
        body: emailTemplateSettings.screeningEEC.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      screeningSchool: {
        subject: emailTemplateSettings.screeningSchool.subject || '',
        body: emailTemplateSettings.screeningSchool.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      acceptanceEEC: {
        subject: emailTemplateSettings.acceptanceEEC.subject || '',
        body: emailTemplateSettings.acceptanceEEC.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      acceptanceSchool: {
        subject: emailTemplateSettings.acceptanceSchool.subject || '',
        body: emailTemplateSettings.acceptanceSchool.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      acceptanceConditionalEEC: {
        subject: emailTemplateSettings.acceptanceConditionalEEC.subject || '',
        body: emailTemplateSettings.acceptanceConditionalEEC.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      acceptanceConditionalSchool: {
        subject: emailTemplateSettings.acceptanceConditionalSchool.subject || '',
        body: emailTemplateSettings.acceptanceConditionalSchool.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      rejection: {
        subject: emailTemplateSettings.rejection.subject || '',
        body: emailTemplateSettings.rejection.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      },
      completion: {
        subject: emailTemplateSettings.completion.subject || '',
        body: emailTemplateSettings.completion.body || '',
        unsavedSubject: '',
        unsavedBody: ''
      }
    };

    // Load initial email template settings into UI
    const templateTypeSelect = document.getElementById('templateType');
    const templateSubjectInput = document.getElementById('templateSubject');
    const templateBodyInput = document.getElementById('templateBody');

    // Set the default template type to "referral"
    const defaultTemplate = EMAIL_TEMPLATE_SETTINGS.waitlist;
    templateSubjectInput.value = defaultTemplate.subject;
    templateBodyInput.innerHTML = defaultTemplate.body;

    // Update unsaved subject on input
    templateSubjectInput.addEventListener('input', function() {
      const selectedTemplate = EMAIL_TEMPLATE_SETTINGS[templateTypeSelect.value];
      if (selectedTemplate) {
        selectedTemplate.unsavedSubject = templateSubjectInput.value;
      }
    });

    // Update unsaved body on input
    templateBodyInput.addEventListener('input', function() {
      const selectedTemplate = EMAIL_TEMPLATE_SETTINGS[templateTypeSelect.value];
      if (selectedTemplate) {
        selectedTemplate.unsavedBody = templateBodyInput.innerHTML;
      }
    });

    // Handle template type change
    templateTypeSelect.addEventListener('change', function() {
      const selectedTemplate = EMAIL_TEMPLATE_SETTINGS[templateTypeSelect.value];
      if (selectedTemplate) {
        templateSubjectInput.value = selectedTemplate.unsavedSubject || selectedTemplate.subject;
        templateBodyInput.innerHTML = selectedTemplate.unsavedBody || selectedTemplate.body;
        templateBodyInput.scrollTop = 0;
      }
    });
  }

  ///////////////////
  // SAVE SETTINGS //
  ///////////////////

  function saveSettings() {
    if (busyFlag) {
      showError("Error: OPERATION_IN_PROGRESS");
      busyFlag = false;
      return;
    }

    showToast("", "Saving changes...", 5000);
    busyFlag = true;
    
    appSettings = getAppSettings();
    userSettings = getUserSettings();
    
    google.script.run
      .withSuccessHandler(() => {
        APP_SETTINGS = appSettings; // Save to global settings
        USER_SETTINGS = userSettings; // Save to global user settings

        // Update the UI
        setTheme();
        setColorPicker();
        document.getElementById('header-text').innerText = "Falcon Enrollment - " + APP_SETTINGS.schoolSettings.schoolYear;
    
        saveChangesButton.classList.remove('tool-bar-button-unsaved');
        playNotificationSound("success");
        showToast("", "Settings saved!", 5000);
        saveFlag = true;
        busyFlag = false;
      })
      .withFailureHandler((error) => {
        const errorString = String(error);
        
        if (errorString.includes("401")) {
          sessionError();
        } else {
          showError("Error: SAVE_FAILURE");
        }
        
        saveFlag = false;
        busyFlag = false;
      })
    .writeSettings(userSettings, appSettings);
  }

  function getUserSettings() {
    const theme = document.getElementById('theme').value;
    let customThemeType;
    let customThemePrimaryColor;
    let customThemeAccentColor;

    if (theme === 'custom') {
      customThemeType = document.getElementById('themeTypeSelect').value;
      customThemePrimaryColor = document.getElementById('primaryColorPicker').value;
      customThemeAccentColor = document.getElementById('accentColorPicker').value;
    } else {
      customThemeType = '';
      customThemePrimaryColor = '';
      customThemeAccentColor = '';
    }
    
    return {
      theme: theme,
      customThemeType: customThemeType, 
      customThemePrimaryColor: customThemePrimaryColor,
      customThemeAccentColor: customThemeAccentColor,
      alertSound: document.getElementById('alertSound').value,
      emailSound: document.getElementById('emailSound').value,
      removeSound: document.getElementById('removeSound').value,
      successSound: document.getElementById('successSound').value,
      silentMode: document.getElementById('silentModeSwitch').checked ? 'true' : 'false'
    };
  }

  function getAppSettings() {
    // Get school settings    
    const schoolSettings = {
      schoolName: document.getElementById('schoolName').value,
      schoolYear: document.getElementById('schoolYear').value
    };

    // Fee settings
    const feeSettings = {
      registrationFee: document.getElementById('registrationFee').value,
      registrationFeeEEC: document.getElementById('registrationFeeEEC').value,
      hugFee: document.getElementById('hugFee').value,
      familyCommitmentFee: document.getElementById('familyCommitmentFee').value,
      flashFee: document.getElementById('flashFee').value,
      withdrawalFee: document.getElementById('withdrawalFee').value
    };

    // Get email template settings
    Object.keys(EMAIL_TEMPLATE_SETTINGS).forEach((key) => {
      const template = EMAIL_TEMPLATE_SETTINGS[key];
      if (template.unsavedSubject !== "" || template.unsavedBody !== "") {
        template.subject = template.unsavedSubject || template.subject;
        template.body = template.unsavedBody || template.body;
      }
    });
    
    const emailTemplateSettings = {
      waitlist: {
        subject: EMAIL_TEMPLATE_SETTINGS.waitlist.subject,
        body: EMAIL_TEMPLATE_SETTINGS.waitlist.body
      },
      evaluation: {
        subject: EMAIL_TEMPLATE_SETTINGS.evaluation.subject,
        body: EMAIL_TEMPLATE_SETTINGS.evaluation.body
      },
      screeningEEC: {
        subject: EMAIL_TEMPLATE_SETTINGS.screeningEEC.subject,
        body: EMAIL_TEMPLATE_SETTINGS.screeningEEC.body
      },
      screeningSchool: {
        subject: EMAIL_TEMPLATE_SETTINGS.screeningSchool.subject,
        body: EMAIL_TEMPLATE_SETTINGS.screeningSchool.body
      },
      acceptanceEEC: {
        subject: EMAIL_TEMPLATE_SETTINGS.acceptanceEEC.subject,
        body: EMAIL_TEMPLATE_SETTINGS.acceptanceEEC.body
      },
      acceptanceSchool: {
        subject: EMAIL_TEMPLATE_SETTINGS.acceptanceSchool.subject,
        body: EMAIL_TEMPLATE_SETTINGS.acceptanceSchool.body
      },
      acceptanceConditionalEEC: {
        subject: EMAIL_TEMPLATE_SETTINGS.acceptanceConditionalEEC.subject,
        body: EMAIL_TEMPLATE_SETTINGS.acceptanceConditionalEEC.body
      },
      acceptanceConditionalSchool: {
        subject: EMAIL_TEMPLATE_SETTINGS.acceptanceConditionalSchool.subject,
        body: EMAIL_TEMPLATE_SETTINGS.acceptanceConditionalSchool.body
      },
      rejection: {
        subject: EMAIL_TEMPLATE_SETTINGS.rejection.subject,
        body: EMAIL_TEMPLATE_SETTINGS.rejection.body
      },
      completion: {
        subject: EMAIL_TEMPLATE_SETTINGS.completion.subject,
        body: EMAIL_TEMPLATE_SETTINGS.completion.body
      }
    };

    return {
      schoolSettings,
      feeSettings,
      emailTemplateSettings
    };
  }

  ///////////////////////
  // UTILITY FUNCTIONS //
  ///////////////////////

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

      case "Error: SAVE_FAILURE":
        title = errorIcon + "Save Error";
        message = "An unknown error occurred while saving the settings. The operation could not be completed.";
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
  
  function saveAlert() {
    saveFlag = false;
    saveChangesButton.classList.add('tool-bar-button-unsaved');
  }

  /////////////////////
  // DATA VALIDATION //
  /////////////////////
  
  function formatCurrency(input) {
    // Remove all non-digit characters except for the first period
    let inputValue = input.value.replace(/[^\d.]+/g, "");

    // Split the input value into dollars and cents
    let [dollars, cents] = inputValue.split(".");

    // Add commas to the dollars part
    let formattedDollars = '';
    let count = 0;
    for (let i = dollars.length - 1; i >= 0; i--) {
      count++;
      formattedDollars = dollars.charAt(i) + formattedDollars;
      if (count % 3 === 0 && i !== 0) {
        formattedDollars = ',' + formattedDollars;
      }
    }

    // Limit cents to two digits
    if (cents !== undefined) {
      cents = cents.slice(0, 2); // Take only the first two characters
    }

    // Combine dollars and cents with a period
    let formattedValue = '$' + formattedDollars;
    if (cents !== undefined) {
      formattedValue += '.' + cents;
    }

    // Update the input value with the formatted value
    input.value = formattedValue;
  }
  
</script>
