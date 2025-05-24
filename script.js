document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const monthlySalaryInput = document.getElementById('monthlySalary');
    const annualSalaryInput = document.getElementById('annualSalary');
    const paydayInput = document.getElementById('payday');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const saveSettingsButton = document.getElementById('saveSettings');
    const salaryDisplay = document.getElementById('salaryDisplay');
    const monthSalarySoFarDisplay = document.getElementById('monthSalarySoFar');
    const timeUntilPaydayDisplay = document.getElementById('timeUntilPayday');
    const settingsArea = document.getElementById('settingsArea');
    const editSettingsButton = document.getElementById('editSettingsButton');

    // Interval Timers
    let salaryInterval = null; // For 1-second calculation of today's salary
    let uiUpdateInterval_salaryDisplay = null; // For 3-second UI update of today's salary
    let monthSalaryInterval = null; // For 1-second calculation of month's salary
    let uiUpdateInterval_monthSalaryDisplay = null; // For 3-second UI update of month's salary
    let paydayCountdownInterval = null;

    // Variables to store latest calculated values
    let lastKnownAccumulatedSalaryToday = 0.00;
    let lastKnownMonthSalarySoFar = 0.00;

    // --- Settings Management ---
    function saveSettings() {
        let monthlySalary = parseFloat(monthlySalaryInput.value);
        const annualSalary = parseFloat(annualSalaryInput.value);
        const payday = parseInt(paydayInput.value);
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (isNaN(monthlySalary) || monthlySalary <= 0) {
            if (!isNaN(annualSalary) && annualSalary > 0) {
                monthlySalary = annualSalary / 12;
                monthlySalaryInput.value = monthlySalary.toFixed(2);
            } else {
                alert('Please enter a valid monthly or annual salary.');
                return;
            }
        }
        if (isNaN(payday) || payday < 1 || payday > 31) {
            alert('Please enter a valid payday (1-31).');
            return;
        }
        if (!startTime || !endTime) {
            alert('Please enter valid start and end times.');
            return;
        }
        if (startTime >= endTime) {
            alert('End time must be after start time for same-day shifts.');
            return;
        }

        localStorage.setItem('monthlySalary', monthlySalary);
        localStorage.setItem('startTime', startTime);
        localStorage.setItem('endTime', endTime);
        localStorage.setItem('payday', payday);

        settingsArea.classList.add('hidden');
        editSettingsButton.classList.remove('hidden');

        calculateAndDisplaySalary();
        calculateAndDisplayMonthSalarySoFar();
        updatePaydayCountdown();
    }

    function loadSettings() {
        const monthlySalary = localStorage.getItem('monthlySalary');
        const startTime = localStorage.getItem('startTime');
        const endTime = localStorage.getItem('endTime');
        const payday = localStorage.getItem('payday');

        if (monthlySalary) {
            monthlySalaryInput.value = parseFloat(monthlySalary).toFixed(2);
            annualSalaryInput.value = (parseFloat(monthlySalary) * 12).toFixed(2);
        }
        if (startTime) {
            startTimeInput.value = startTime;
        }
        if (endTime) {
            endTimeInput.value = endTime;
        }
        if (payday) {
            paydayInput.value = payday;
        }

        if (monthlySalary && startTime && endTime && payday) {
            settingsArea.classList.add('hidden');
            editSettingsButton.classList.remove('hidden');
        } else {
            settingsArea.classList.remove('hidden');
            editSettingsButton.classList.add('hidden');
        }
    }

    // --- Bi-directional Salary Calculation ---
    monthlySalaryInput.addEventListener('input', () => {
        const monthly = parseFloat(monthlySalaryInput.value);
        if (!isNaN(monthly)) {
            annualSalaryInput.value = (monthly * 12).toFixed(2);
        } else {
            annualSalaryInput.value = '';
        }
    });

    annualSalaryInput.addEventListener('input', () => {
        const annual = parseFloat(annualSalaryInput.value);
        if (!isNaN(annual)) {
            monthlySalaryInput.value = (annual / 12).toFixed(2);
        } else {
            monthlySalaryInput.value = '';
        }
    });

    // --- Salary Calculation and Display (Today) ---
    function calculateAndDisplaySalary() {
        if (salaryInterval) clearInterval(salaryInterval);
        if (uiUpdateInterval_salaryDisplay) clearInterval(uiUpdateInterval_salaryDisplay);

        lastKnownAccumulatedSalaryToday = 0.00; // Reset
        if (salaryDisplay) salaryDisplay.textContent = lastKnownAccumulatedSalaryToday.toFixed(2);


        const monthlySalary = parseFloat(localStorage.getItem('monthlySalary'));
        const startTimeString = localStorage.getItem('startTime');
        const endTimeString = localStorage.getItem('endTime');

        if (isNaN(monthlySalary) || !startTimeString || !endTimeString) {
            if (salaryDisplay) salaryDisplay.textContent = '0.00';
            return;
        }

        const workingDaysPerMonth = 22; 
        const dailySalary = monthlySalary / workingDaysPerMonth;
        
        const now = new Date(); // Should be static for this calculation instance's parameters
        const currentDay = now.toISOString().split('T')[0]; // Or use now for these if they should be dynamic too
        const workStartTime = new Date(`${currentDay}T${startTimeString}`);
        const workEndTime = new Date(`${currentDay}T${endTimeString}`);
        let totalWorkMillisecondsInDay = workEndTime.getTime() - workStartTime.getTime();


        if (endTimeString < startTimeString) { // Overnight shift
            totalWorkMillisecondsInDay += 24 * 60 * 60 * 1000;
        }

        if (totalWorkMillisecondsInDay <= 0 ) { // Removed: && workEndTime <= workStartTime && !(endTimeString < startTimeString)
             if (salaryDisplay) salaryDisplay.textContent = 'Error!'; // Check if salaryDisplay exists
            return;
        }
        const salaryPerMillisecond = dailySalary / totalWorkMillisecondsInDay;

        function performSalaryCalculation() {
            const currentTime = new Date(); // This 'now' is for the current moment of calculation
            let effectiveWorkStartTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), workStartTime.getHours(), workStartTime.getMinutes(), workStartTime.getSeconds());
            let effectiveWorkEndTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), workEndTime.getHours(), workEndTime.getMinutes(), workEndTime.getSeconds());


            if (endTimeString < startTimeString) { 
                if (currentTime.getHours() < workStartTime.getHours()) { // If current time is e.g. 2 AM, and work started at 10 PM yesterday
                    effectiveWorkStartTime.setDate(effectiveWorkStartTime.getDate() - 1);
                } else { // If current time is e.g. 11 PM, and work started at 10 PM today, end time is tomorrow
                    effectiveWorkEndTime.setDate(effectiveWorkEndTime.getDate() + 1);
                }
            }

            if (currentTime.getTime() >= effectiveWorkStartTime.getTime() && currentTime.getTime() <= effectiveWorkEndTime.getTime()) {
                const elapsedMillisecondsToday = currentTime.getTime() - effectiveWorkStartTime.getTime();
                lastKnownAccumulatedSalaryToday = elapsedMillisecondsToday * salaryPerMillisecond;
            } else {
                if (currentTime.getTime() < effectiveWorkStartTime.getTime()) {
                    lastKnownAccumulatedSalaryToday = 0.00;
                } else if (currentTime.getTime() > effectiveWorkEndTime.getTime()) {
                    lastKnownAccumulatedSalaryToday = totalWorkMillisecondsInDay * salaryPerMillisecond; // Show full daily salary
                    if (salaryInterval) clearInterval(salaryInterval); 
                    salaryInterval = null; // Mark as stopped
                }
            }
        }

        function updateSalaryDisplayUI() {
            if (salaryDisplay) salaryDisplay.textContent = lastKnownAccumulatedSalaryToday.toFixed(2);
            if (!salaryInterval && uiUpdateInterval_salaryDisplay) { // If calculation has stopped, stop UI updates too
                clearInterval(uiUpdateInterval_salaryDisplay);
                uiUpdateInterval_salaryDisplay = null;
            }
        }
        
        performSalaryCalculation(); // Initial calculation
        updateSalaryDisplayUI(); // Initial UI update

        salaryInterval = setInterval(performSalaryCalculation, 1000);
        uiUpdateInterval_salaryDisplay = setInterval(updateSalaryDisplayUI, 3000);
    }

    // --- Salary Earned This Month ---
    function calculateAndDisplayMonthSalarySoFar() {
        if (monthSalaryInterval) clearInterval(monthSalaryInterval);
        if (uiUpdateInterval_monthSalaryDisplay) clearInterval(uiUpdateInterval_monthSalaryDisplay);
        
        lastKnownMonthSalarySoFar = 0.00; // Reset
        if(monthSalarySoFarDisplay) monthSalarySoFarDisplay.textContent = lastKnownMonthSalarySoFar.toFixed(2);

        const monthlySalary = parseFloat(localStorage.getItem('monthlySalary'));
        const startTimeString = localStorage.getItem('startTime');
        const endTimeString = localStorage.getItem('endTime');

        if (isNaN(monthlySalary) || !startTimeString || !endTimeString) {
            if(monthSalarySoFarDisplay) monthSalarySoFarDisplay.textContent = '0.00';
            return;
        }

        const workingDaysPerMonth = 22;
        const dailySalary = monthlySalary / workingDaysPerMonth;

        function performMonthSalaryCalculation() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const todayDate = now.getDate();

            let completedWorkdaysThisMonth = 0;
            for (let day = 1; day < todayDate; day++) {
                const d = new Date(year, month, day);
                if (d.getDay() >= 1 && d.getDay() <= 5) { 
                    completedWorkdaysThisMonth++;
                }
            }
            let salaryFromCompletedDays = completedWorkdaysThisMonth * dailySalary;
            let salaryToday = 0;
            const currentDayOfWeek = now.getDay();

            if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) { // Is it a Workday?
                const workStartTimeDate = new Date(`1970-01-01T${startTimeString}`); // For hour/minute extraction
                const workEndTimeDate = new Date(`1970-01-01T${endTimeString}`); // For hour/minute extraction

                let effectiveWorkStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), workStartTimeDate.getHours(), workStartTimeDate.getMinutes());
                let effectiveWorkEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), workEndTimeDate.getHours(), workEndTimeDate.getMinutes());
                
                if (endTimeString < startTimeString) { // Overnight shift for *today's* segment
                    if (now.getHours() < workStartTimeDate.getHours()) { 
                        // This means we are past midnight, shift started yesterday.
                        // For "month salary so far", the part of shift from yesterday is already in `salaryFromCompletedDays`.
                        // We only care about the part from midnight *today* until `now` or `effectiveWorkEndTime` today.
                        effectiveWorkStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); // Start from midnight today
                    } else { // Shift starts today and ends tomorrow
                        effectiveWorkEndTime.setDate(effectiveWorkEndTime.getDate() + 1);
                    }
                }

                if (now.getTime() >= effectiveWorkStartTime.getTime() && now.getTime() <= effectiveWorkEndTime.getTime()) {
                    // Calculate total duration of *this specific segment* of the workday
                    // (could be full day, or partial if overnight and started yesterday)
                    const segmentDuration = effectiveWorkEndTime.getTime() - effectiveWorkStartTime.getTime();
                    if (segmentDuration > 0) {
                        const salaryPerMsForSegment = dailySalary / (workEndTimeDate.getTime() - workStartTimeDate.getTime() + (endTimeString < startTimeString ? 24*60*60*1000 : 0)); // Salary rate based on full shift
                        const elapsedMsInSegment = now.getTime() - effectiveWorkStartTime.getTime();
                        salaryToday = elapsedMsInSegment * salaryPerMsForSegment;
                    }
                } else if (now.getTime() > effectiveWorkEndTime.getTime()) {
                    // If current time is past today's work segment end time
                    if (effectiveWorkStartTime.getDate() === now.getDate() || // Shift started today
                        (effectiveWorkStartTime.getDate() < now.getDate() && endTimeString < startTimeString) // Shift started yesterday and ended today
                    ) {
                         salaryToday = dailySalary;
                    }
                }
            }
            lastKnownMonthSalarySoFar = salaryFromCompletedDays + salaryToday;
        }

        function updateMonthSalaryDisplayUI() {
            if (monthSalarySoFarDisplay) monthSalarySoFarDisplay.textContent = lastKnownMonthSalarySoFar.toFixed(2);
        }

        performMonthSalaryCalculation(); // Initial calculation
        updateMonthSalaryDisplayUI(); // Initial UI update

        monthSalaryInterval = setInterval(performMonthSalaryCalculation, 1000);
        uiUpdateInterval_monthSalaryDisplay = setInterval(updateMonthSalaryDisplayUI, 3000);
    }

    // --- Payday Countdown ---
    function updatePaydayCountdown() {
        if (paydayCountdownInterval) clearInterval(paydayCountdownInterval);
        if(timeUntilPaydayDisplay) timeUntilPaydayDisplay.textContent = 'N/A';


        const paydaySetting = localStorage.getItem('payday');
        if (!paydaySetting) {
            if(timeUntilPaydayDisplay) timeUntilPaydayDisplay.textContent = "Payday not set";
            return;
        }
        const paydayDay = parseInt(paydaySetting);

        function countdown() {
            const now = new Date();
            let targetYear = now.getFullYear();
            let targetMonth = now.getMonth(); 

            let nextPaydayDateObj = new Date(targetYear, targetMonth, paydayDay, 0,0,0,0); // Target start of the day

            if (now.getTime() >= nextPaydayDateObj.getTime()) { 
                targetMonth++; 
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear++;
                }
            }
            
            const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const actualPaydayCalDay = Math.min(paydayDay, daysInTargetMonth);
            let nextPayday = new Date(targetYear, targetMonth, actualPaydayCalDay, 0,0,0,0);
            
            // If the calculated nextPayday is still not in the future (e.g. today after adjustment was still today but time passed)
            if (now.getTime() >= nextPayday.getTime()) {
                 targetMonth = nextPayday.getMonth() + 1; 
                 if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear = nextPayday.getFullYear() + 1;
                 } else {
                    targetYear = nextPayday.getFullYear();
                 }
                 const daysInFinalTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                 const actualFinalPaydayCalDay = Math.min(paydayDay, daysInFinalTargetMonth);
                 nextPayday = new Date(targetYear, targetMonth, actualFinalPaydayCalDay, 0,0,0,0);
            }


            const diff = nextPayday.getTime() - now.getTime();

            if (diff <= 0) { // Should ideally be future now
                if(timeUntilPaydayDisplay) timeUntilPaydayDisplay.textContent = "Calculating next..."; 
                return; // Wait for next tick to resolve, should be extremely rare
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            if(timeUntilPaydayDisplay) timeUntilPaydayDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
        countdown();
        paydayCountdownInterval = setInterval(countdown, 1000);
    }

    // --- Event Listeners ---
    saveSettingsButton.addEventListener('click', saveSettings);

    editSettingsButton.addEventListener('click', () => {
        settingsArea.classList.remove('hidden');
        editSettingsButton.classList.add('hidden');
        
        // Clear all calculation and UI update intervals
        if (salaryInterval) clearInterval(salaryInterval);
        if (uiUpdateInterval_salaryDisplay) clearInterval(uiUpdateInterval_salaryDisplay);
        if (monthSalaryInterval) clearInterval(monthSalaryInterval);
        if (uiUpdateInterval_monthSalaryDisplay) clearInterval(uiUpdateInterval_monthSalaryDisplay);
        if (paydayCountdownInterval) clearInterval(paydayCountdownInterval);
        
        salaryInterval = null; uiUpdateInterval_salaryDisplay = null;
        monthSalaryInterval = null; uiUpdateInterval_monthSalaryDisplay = null;
        paydayCountdownInterval = null;

        if (salaryDisplay) salaryDisplay.textContent = '0.00';
        if (monthSalarySoFarDisplay) monthSalarySoFarDisplay.textContent = '0.00';
        if (timeUntilPaydayDisplay) timeUntilPaydayDisplay.textContent = 'N/A';
        lastKnownAccumulatedSalaryToday = 0.00;
        lastKnownMonthSalarySoFar = 0.00;
    });

    // --- Initial Load ---
    loadSettings();
    if (localStorage.getItem('monthlySalary') && localStorage.getItem('startTime') && localStorage.getItem('endTime')) {
        calculateAndDisplaySalary();
        calculateAndDisplayMonthSalarySoFar();
    }
    if (localStorage.getItem('payday')) {
        updatePaydayCountdown();
    }
});
