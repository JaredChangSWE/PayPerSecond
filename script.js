document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const monthlySalaryInput = document.getElementById('monthlySalary');
    const annualSalaryInput = document.getElementById('annualSalary'); // New
    const paydayInput = document.getElementById('payday'); // New
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const saveSettingsButton = document.getElementById('saveSettings');
    const salaryDisplay = document.getElementById('salaryDisplay');
    const monthSalarySoFarDisplay = document.getElementById('monthSalarySoFar'); // New
    const timeUntilPaydayDisplay = document.getElementById('timeUntilPayday'); // New
    const settingsArea = document.getElementById('settingsArea');
    const editSettingsButton = document.getElementById('editSettingsButton');

    // Interval Timers
    let salaryInterval = null;
    let monthSalaryInterval = null; // New
    let paydayCountdownInterval = null; // New

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
        localStorage.setItem('payday', payday); // Save payday

        settingsArea.classList.add('hidden');
        editSettingsButton.classList.remove('hidden');

        // Restart all calculations with new settings
        calculateAndDisplaySalary();
        calculateAndDisplayMonthSalarySoFar();
        updatePaydayCountdown();
    }

    function loadSettings() {
        const monthlySalary = localStorage.getItem('monthlySalary');
        const startTime = localStorage.getItem('startTime');
        const endTime = localStorage.getItem('endTime');
        const payday = localStorage.getItem('payday'); // Load payday

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

        const monthlySalary = parseFloat(localStorage.getItem('monthlySalary'));
        const startTimeString = localStorage.getItem('startTime');
        const endTimeString = localStorage.getItem('endTime');

        if (isNaN(monthlySalary) || !startTimeString || !endTimeString) {
            salaryDisplay.textContent = '0.00';
            return;
        }

        const now = new Date();
        const currentDay = now.toISOString().split('T')[0];
        const workStartTime = new Date(`${currentDay}T${startTimeString}`);
        const workEndTime = new Date(`${currentDay}T${endTimeString}`);

        if (workEndTime <= workStartTime && !(endTimeString < startTimeString)) {
            salaryDisplay.textContent = 'Error!';
            return;
        }

        const workingDaysPerMonth = 22; // Assumption
        const dailySalary = monthlySalary / workingDaysPerMonth;
        let totalWorkMillisecondsInDay = workEndTime - workStartTime;

        if (endTimeString < startTimeString) { // Overnight shift
            totalWorkMillisecondsInDay += 24 * 60 * 60 * 1000;
        }

        if (totalWorkMillisecondsInDay <= 0) {
            salaryDisplay.textContent = 'Error!';
            return;
        }
        const salaryPerMillisecond = dailySalary / totalWorkMillisecondsInDay;

        function updateSalary() {
            const currentTime = new Date();
            let effectiveWorkStartTime = new Date(`${currentTime.toISOString().split('T')[0]}T${startTimeString}`);
            let effectiveWorkEndTime = new Date(`${currentTime.toISOString().split('T')[0]}T${endTimeString}`);

            if (endTimeString < startTimeString) { // Overnight shift
                if (currentTime.getHours() < new Date(`1970-01-01T${startTimeString}`).getHours()) {
                    effectiveWorkStartTime.setDate(effectiveWorkStartTime.getDate() - 1);
                } else {
                    effectiveWorkEndTime.setDate(effectiveWorkEndTime.getDate() + 1);
                }
            }

            if (currentTime >= effectiveWorkStartTime && currentTime <= effectiveWorkEndTime) {
                const elapsedMillisecondsToday = currentTime - effectiveWorkStartTime;
                const accumulatedSalaryToday = elapsedMillisecondsToday * salaryPerMillisecond;
                salaryDisplay.textContent = accumulatedSalaryToday.toFixed(2);
            } else {
                if (currentTime < effectiveWorkStartTime) {
                    salaryDisplay.textContent = '0.00';
                } else if (currentTime > effectiveWorkEndTime) {
                    const totalAccumulated = totalWorkMillisecondsInDay * salaryPerMillisecond;
                    salaryDisplay.textContent = totalAccumulated.toFixed(2);
                    if (salaryInterval) clearInterval(salaryInterval); // Stop once full day's salary is shown
                }
            }
        }
        updateSalary();
        salaryInterval = setInterval(updateSalary, 1000);
    }

    // --- Salary Earned This Month ---
    function calculateAndDisplayMonthSalarySoFar() {
        if (monthSalaryInterval) clearInterval(monthSalaryInterval);

        const monthlySalary = parseFloat(localStorage.getItem('monthlySalary'));
        const startTimeString = localStorage.getItem('startTime');
        const endTimeString = localStorage.getItem('endTime');

        if (isNaN(monthlySalary) || !startTimeString || !endTimeString) {
            monthSalarySoFarDisplay.textContent = '0.00';
            return;
        }

        const workingDaysPerMonth = 22; // Assumption
        const dailySalary = monthlySalary / workingDaysPerMonth;

        function updateMonthSalary() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const todayDate = now.getDate();

            let completedWorkdaysThisMonth = 0;
            for (let day = 1; day < todayDate; day++) {
                const d = new Date(year, month, day);
                if (d.getDay() >= 1 && d.getDay() <= 5) { // Monday to Friday
                    completedWorkdaysThisMonth++;
                }
            }
            let salaryFromCompletedDays = completedWorkdaysThisMonth * dailySalary;

            // Current day's contribution (if it's a workday)
            let salaryToday = 0;
            const currentDayOfWeek = now.getDay();
            if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) { // Monday to Friday
                let effectiveWorkStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(startTimeString.split(':')[0]), parseInt(startTimeString.split(':')[1]));
                let effectiveWorkEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(endTimeString.split(':')[0]), parseInt(endTimeString.split(':')[1]));
                
                if (endTimeString < startTimeString) { // Overnight shift logic for today
                    if (now.getHours() < new Date(`1970-01-01T${startTimeString}`).getHours()) { // After midnight, part of yesterday's shift start
                         // This part is complex for "month salary so far" if shift spans midnight
                         // For simplicity here, if current time is past midnight but part of a shift that started yesterday,
                         // it counts towards *yesterday's* daily total which is already in completedWorkdaysThisMonth.
                         // The current day's calculation will only apply if the shift starts and possibly ends today.
                         // A more robust solution would track exact work segments.
                    } else { // Shift started today, may end tomorrow
                        effectiveWorkEndTime.setDate(effectiveWorkEndTime.getDate() + 1);
                    }
                }

                if (now >= effectiveWorkStartTime && now <= effectiveWorkEndTime) {
                    const totalWorkMillisecondsInDay = (effectiveWorkEndTime - effectiveWorkStartTime);
                    const salaryPerMillisecondToday = dailySalary / totalWorkMillisecondsInDay;
                    const elapsedMillisecondsToday = now - effectiveWorkStartTime;
                    salaryToday = elapsedMillisecondsToday * salaryPerMillisecondToday;
                } else if (now > effectiveWorkEndTime) {
                    salaryToday = dailySalary; // Full day's salary if past work hours
                }
            }
            
            monthSalarySoFarDisplay.textContent = (salaryFromCompletedDays + salaryToday).toFixed(2);
        }
        updateMonthSalary();
        monthSalaryInterval = setInterval(updateMonthSalary, 1000); // Update frequently
    }

    // --- Payday Countdown ---
    function updatePaydayCountdown() {
        if (paydayCountdownInterval) clearInterval(paydayCountdownInterval);

        const paydaySetting = localStorage.getItem('payday');
        if (!paydaySetting) {
            timeUntilPaydayDisplay.textContent = "Payday not set";
            return;
        }
        const paydayDay = parseInt(paydaySetting); // This is the user's preferred day (e.g., 15, 30, 31)

        function countdown() {
            const now = new Date();
            let targetYear = now.getFullYear();
            let targetMonth = now.getMonth(); // 0-indexed

            // Determine if we are aiming for this month's payday or next month's
            if (now.getDate() > paydayDay || (now.getDate() === paydayDay && now.getTime() >= new Date(targetYear, targetMonth, paydayDay).getTime())) {
                // If current day is past preferred payday OR (it's the preferred payday AND current time is past midnight of that day)
                // then aim for next month.
                targetMonth++;
                if (targetMonth > 11) { // Month overflow
                    targetMonth = 0;
                    targetYear++;
                }
            }

            // Calculate the actual number of days in the target month
            const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            
            // Determine the actual payday date, ensuring it's not beyond the last day of the month
            const actualPaydayDate = Math.min(paydayDay, daysInTargetMonth);
            
            let nextPayday = new Date(targetYear, targetMonth, actualPaydayDate);
            
            // If, for some reason (e.g. payday was 29th, current month Feb, nextPayday becomes Feb 29th but it's not a leap year)
            // the date got resolved to the next month (e.g. March 1st if Feb 29 doesn't exist),
            // it means we should have picked the last valid day of targetMonth.
            // The new Date(targetYear, targetMonth + 1, 0).getDate() above handles this correctly for `daysInTargetMonth`.
            // So `actualPaydayDate` will be correct. `new Date(targetYear, targetMonth, actualPaydayDate)` should be fine.

            const diff = nextPayday.getTime() - now.getTime(); // Ensure using getTime() for direct comparison

            if (diff <= 0) { 
                 // This case might occur if it's currently past the calculated payday time on the payday itself.
                 // Or if the logic for advancing to next month didn't quite catch it.
                 // To be safe, if diff is <=0, try to calculate for the *next* available payday.
                 // This typically means advancing the month again.
                targetMonth++;
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear++;
                }
                const daysInNextTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                const actualNextPaydayDate = Math.min(paydayDay, daysInNextTargetMonth);
                nextPayday = new Date(targetYear, targetMonth, actualNextPaydayDate);
                
                // Recalculate diff
                const newDiff = nextPayday.getTime() - now.getTime();
                if (newDiff <=0) {
                    // If still non-positive, there's a deeper issue or it's truly the exact moment.
                    timeUntilPaydayDisplay.textContent = "Processing Payday..."; // Or similar
                    return;
                }
                 const days = Math.floor(newDiff / (1000 * 60 * 60 * 24));
                 const hours = Math.floor((newDiff / (1000 * 60 * 60)) % 24);
                 const minutes = Math.floor((newDiff / 1000 / 60) % 60);
                 const seconds = Math.floor((newDiff / 1000) % 60);
                 timeUntilPaydayDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;

            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                timeUntilPaydayDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
            }
        }
        countdown(); // Initial call
        paydayCountdownInterval = setInterval(countdown, 1000);
    }


    // --- Event Listeners ---
    saveSettingsButton.addEventListener('click', saveSettings);

    editSettingsButton.addEventListener('click', () => {
        settingsArea.classList.remove('hidden');
        editSettingsButton.classList.add('hidden');
        // Stop intervals when settings are opened
        if (salaryInterval) clearInterval(salaryInterval);
        if (monthSalaryInterval) clearInterval(monthSalaryInterval);
        if (paydayCountdownInterval) clearInterval(paydayCountdownInterval);
        salaryDisplay.textContent = '0.00';
        monthSalarySoFarDisplay.textContent = '0.00';
        timeUntilPaydayDisplay.textContent = 'N/A';
    });

    // --- Initial Load ---
    loadSettings();
    // Initial calls to display data if settings are already stored
    if (localStorage.getItem('monthlySalary') && localStorage.getItem('startTime') && localStorage.getItem('endTime')) {
        calculateAndDisplaySalary();
        calculateAndDisplayMonthSalarySoFar();
    }
    if (localStorage.getItem('payday')) {
        updatePaydayCountdown();
    }
});
