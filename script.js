document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const monthlySalaryInput = document.getElementById('monthlySalary');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const saveSettingsButton = document.getElementById('saveSettings');
    const salaryDisplay = document.getElementById('salaryDisplay');
    const settingsArea = document.getElementById('settingsArea'); // New
    const editSettingsButton = document.getElementById('editSettingsButton'); // New

    // --- Settings Management ---
    function saveSettings() {
        const monthlySalary = parseFloat(monthlySalaryInput.value);
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        // Basic Validation
        if (isNaN(monthlySalary) || monthlySalary <= 0) {
            alert('Please enter a valid monthly salary.');
            return;
        }
        if (!startTime || !endTime) {
            alert('Please enter valid start and end times.');
            return;
        }
        // Consider allowing start time to be greater than end time for overnight shifts in a future version
        // For now, simple same-day validation
        if (startTime >= endTime) { 
            alert('End time must be after start time for same-day shifts.');
            return;
        }

        localStorage.setItem('monthlySalary', monthlySalary);
        localStorage.setItem('startTime', startTime);
        localStorage.setItem('endTime', endTime);
        alert('Settings saved!');

        settingsArea.classList.add('hidden'); // New
        editSettingsButton.classList.remove('hidden'); // New
        
        calculateAndDisplaySalary(); 
    }

    function loadSettings() {
        const monthlySalary = localStorage.getItem('monthlySalary');
        const startTime = localStorage.getItem('startTime');
        const endTime = localStorage.getItem('endTime');

        if (monthlySalary) {
            monthlySalaryInput.value = monthlySalary;
        }
        if (startTime) {
            startTimeInput.value = startTime;
        }
        if (endTime) {
            endTimeInput.value = endTime;
        }

        // New: Show/hide sections based on loaded settings
        if (monthlySalary && startTime && endTime) { 
            settingsArea.classList.add('hidden');
            editSettingsButton.classList.remove('hidden');
        } else {
            settingsArea.classList.remove('hidden');
            editSettingsButton.classList.add('hidden');
        }
    }

    // --- Salary Calculation and Display ---
    let salaryInterval = null;

    function calculateAndDisplaySalary() {
        if (salaryInterval) {
            clearInterval(salaryInterval);
            salaryInterval = null;
        }

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
        
        // If workEndTime is on the next day (e.g. overnight shift)
        // This simple example assumes same day, but a more robust solution would handle this.
        // For now, this check remains, but a future improvement could be to allow endTime < startTime for overnight.
        if (workEndTime <= workStartTime && !(endTimeString < startTimeString) ) { 
             // The second condition !(endTimeString < startTimeString) is a quick check; 
             // a proper overnight logic would be more complex.
             // For now, if end time is not logically after start time on the same day, treat as error or stop.
            salaryDisplay.textContent = 'Error!'; // Or handle appropriately
            // console.error("Work end time is not after start time for the same day.");
            return;
        }


        const workingDaysPerMonth = 22;
        const dailySalary = monthlySalary / workingDaysPerMonth;
        let totalWorkMillisecondsInDay = workEndTime - workStartTime;

        // Basic handling for overnight shifts if endTime is earlier than startTime (e.g., 22:00 to 05:00)
        // This is a simplified approach. A full solution would need more robust date handling.
        if (endTimeString < startTimeString) { // Indicates overnight shift
            // totalWorkMillisecondsInDay will be negative here from simple subtraction
            // Add 24 hours in milliseconds
            totalWorkMillisecondsInDay += 24 * 60 * 60 * 1000;
        }
        
        if (totalWorkMillisecondsInDay <= 0) {
            salaryDisplay.textContent = 'Error!';
            // console.error("Total work duration is zero or negative.");
            return;
        }
        const salaryPerMillisecond = dailySalary / totalWorkMillisecondsInDay;

        function updateSalary() {
            const currentTime = new Date();
            let effectiveWorkStartTime = new Date(`${currentTime.toISOString().split('T')[0]}T${startTimeString}`);
            let effectiveWorkEndTime = new Date(`${currentTime.toISOString().split('T')[0]}T${endTimeString}`);

            // Adjust for overnight shift for current time comparison
            if (endTimeString < startTimeString) { // Overnight shift
                if (currentTime.getHours() < new Date(`1970-01-01T${startTimeString}`).getHours()) {
                    // Current time is on the "next day" part of an overnight shift (e.g., 02:00 for a 22:00-05:00 shift)
                    // So, the workStartTime for comparison should be from "yesterday"
                    effectiveWorkStartTime.setDate(effectiveWorkStartTime.getDate() - 1);
                } else {
                    // Current time is on the "first day" part of an overnight shift (e.g., 23:00 for a 22:00-05:00 shift)
                    // The effectiveWorkEndTime is on the next day.
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
                    if (salaryInterval) clearInterval(salaryInterval);
                }
            }
        }
        
        updateSalary();
        salaryInterval = setInterval(updateSalary, 1000);
    }

    // --- Event Listeners ---
    saveSettingsButton.addEventListener('click', saveSettings);

    // New: Event listener for editSettingsButton
    editSettingsButton.addEventListener('click', () => {
        settingsArea.classList.remove('hidden');
        editSettingsButton.classList.add('hidden');
    });

    // --- Initial Load ---
    loadSettings(); // This will now also handle initial UI state for settingsArea and editSettingsButton
    calculateAndDisplaySalary();
});
