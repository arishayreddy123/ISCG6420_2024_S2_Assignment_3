document.addEventListener('DOMContentLoaded', function () {
    setMinCheckinDate();
    loadAreasFromXML();

    // Add event listeners for inputs
    document.getElementById('checkin').addEventListener('change', updateCheckoutMinDate);
    document.getElementById('checkin').addEventListener('change', validateBookingForm);
    document.getElementById('checkout').addEventListener('change', validateBookingForm);
    document.getElementById('attendees').addEventListener('input', validateBookingForm);
    document.getElementById('search-button').addEventListener('click', filterAreasByCapacity);
    document.getElementById('book-button').addEventListener('click', confirmBooking);
    document.getElementById('update-button').addEventListener('click', updateBooking);

    // Initially disable the Confirm Booking button
    document.getElementById('book-button').setAttribute('disabled', true);
});

// Coded using Stacks over flow 
// Set the minimum date for check-in (earliest date is always today)
function setMinCheckinDate() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const formattedToday = today.toISOString().split('T')[0];
    const formattedTomorrow = tomorrow.toISOString().split('T')[0];

    // Set the default and min attribute for check-in to today's date
    document.getElementById('checkin').setAttribute('min', formattedToday);
    document.getElementById('checkin').value = formattedToday; // Default check-in to today

    // Set the min attribute and default value for check-out to tomorrow's date
    document.getElementById('checkout').setAttribute('min', formattedTomorrow);
    document.getElementById('checkout').value = formattedTomorrow; // Default check-out to tomorrow

    // Initially, the checkout field should be enabled
    document.getElementById('checkout').removeAttribute('disabled');
}

// Update minimum checkout date based on check-in date
function updateCheckoutMinDate() {
    const checkinDate = document.getElementById('checkin').value;
    const checkoutMinDate = new Date(checkinDate);
    checkoutMinDate.setDate(checkoutMinDate.getDate() + 1);

    const formattedCheckoutMinDate = checkoutMinDate.toISOString().split('T')[0];

    // Enable the checkout field and set its minimum date to the day after the check-in date
    document.getElementById('checkout').removeAttribute('disabled');
    document.getElementById('checkout').setAttribute('min', formattedCheckoutMinDate);

    // Set default checkout date if it is before the new min date
    if (new Date(document.getElementById('checkout').value) < checkoutMinDate) {
        document.getElementById('checkout').value = formattedCheckoutMinDate;
    }

    // Validate the form after check-in date change
    validateBookingForm();
}

// Validate the form and enable/disable the "Confirm Booking" button
function validateBookingForm() {
    const checkinDate = document.getElementById('checkin').value;
    const checkoutDate = document.getElementById('checkout').value;
    const attendees = document.getElementById('attendees').value.trim();
    const selectedArea = document.querySelector('.area.selected');

    // Check if all fields are filled and valid
    if (checkinDate && checkoutDate && attendees > 0 && selectedArea) {
        // Enable the Confirm Booking button if everything is valid
        document.getElementById('book-button').removeAttribute('disabled');
    } else {
        // Disable the Confirm Booking button if any field is missing or invalid
        document.getElementById('book-button').setAttribute('disabled', true);
    }
}


// Coded using Week 9 worksheet and stack overflow
// Load the areas from the XML file and add them to the map
function loadAreasFromXML() {
    fetch('./areas.xml')
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "application/xml");
            const areas = xmlDoc.getElementsByTagName('area');

            for (let i = 0; i < areas.length; i++) {
                const area = areas[i];
                const id = area.querySelector('id').textContent;
                const top = area.querySelector('top').textContent;
                const left = area.querySelector('left').textContent;
                const width = area.querySelector('width').textContent;
                const height = area.querySelector('height').textContent;
                const cost = area.querySelector('cost').textContent;
                const capacity = area.querySelector('capacity').textContent;
                const imagePath = area.querySelector('image').textContent;
                const available = area.querySelector('available').textContent === 'true';

                createAreaElement(id, top, left, width, height, cost, capacity, imagePath, available);
            }
        })
        .catch(err => console.error(err));
}

// Coded using W3 Schools and Stack over flow
// Create area elements dynamically
function createAreaElement(id, top, left, width, height, cost, capacity, imagePath, available) {
    const parkMap = document.querySelector('.park-map');
    const areaDiv = document.createElement('div');
    areaDiv.classList.add('area');
    areaDiv.style.top = top;
    areaDiv.style.left = left;
    areaDiv.style.width = width;
    areaDiv.style.height = height;
    areaDiv.dataset.id = id;
    areaDiv.dataset.cost = cost;
    areaDiv.dataset.capacity = capacity;
    areaDiv.dataset.image = imagePath;
    areaDiv.dataset.available = available;

    if (!available) {
        areaDiv.classList.add('unavailable');
    } else {
        areaDiv.classList.add('available');
    }

    areaDiv.addEventListener('mouseover', function () {
        showTooltip(this);
    });

    areaDiv.addEventListener('mouseleave', function () {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) tooltip.remove();
    });

    areaDiv.addEventListener('click', function () {
        if (available) {
            selectArea(this);
            validateBookingForm(); // Revalidate the form when an area is selected
        } else {
            alert("This area is already booked. Please choose a different area.");
        }
    });

    parkMap.appendChild(areaDiv);
}

// Show tooltip with area details
function showTooltip(area) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `
        <img src="${area.dataset.image}" alt="Area Image" style="width: 150px; height: auto;">
        <p>Area No: ${area.dataset.id}</p>
        <p>Cost: $${area.dataset.cost} per day</p>
        <p>Capacity: ${area.dataset.capacity}</p>
    `;
    document.body.appendChild(tooltip);

    // Position tooltip dynamically with mouse movement
    area.addEventListener('mousemove', (e) => {
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
    });
}

// Select an area and display its information in the booking summary
function selectArea(area) {
    const checkinDate = document.getElementById('checkin').value;
    const checkoutDate = document.getElementById('checkout').value;
    const attendees = document.getElementById('attendees').value;

    if (!checkinDate || !checkoutDate || !attendees || attendees <= 0) {
        alert("Please fill in all fields before selecting an area.");
        return;
    }

    const totalDays = calculateDaysDifference(checkinDate, checkoutDate);
    if (totalDays < 1) {
        alert("Check-out date must be later than the check-in date.");
        return;
    }

    if (!validateAttendees(area.dataset.capacity, attendees)) {
        return;
    }

    // Remove 'selected' class from all areas and add to the clicked one
    const areas = document.querySelectorAll('.area');
    areas.forEach(function (a) {
        a.classList.remove('selected');
    });
    area.classList.add('selected'); // Add 'selected' class to the clicked area

    const totalCost = totalDays * area.dataset.cost;

    document.getElementById('summary-details').innerHTML = `
        Arrival Date: ${new Date(checkinDate).toDateString()}<br>
        Leave Date: ${new Date(checkoutDate).toDateString()}<br>
        Selected Area Number: ${area.dataset.id}<br>
        Cost per Day: $${area.dataset.cost}<br>
        Total Cost: $${totalCost} for ${totalDays} days<br>
        Maximum Capacity: ${area.dataset.capacity}<br>
        Number of Attendees: ${attendees}
    `;

    document.getElementById('book-button').style.display = 'block';
    document.getElementById('update-button').style.display = 'block'; // Show the Update button
}

// Validate the number of attendees based on the selected area's capacity
function validateAttendees(capacity, attendees) {
    attendees = parseInt(attendees, 10);
    capacity = parseInt(capacity, 10);

    if (capacity === 5 && (attendees < 1 || attendees > 5)) {
        alert("For areas with a capacity of 5, the number of attendees must be between 1 and 5.");
        return false;
    }
    if (capacity === 10 && (attendees < 6 || attendees > 10)) {
        alert("For areas with a capacity of 10, the number of attendees must be between 6 and 10.");
        return false;
    }
    if (capacity === 20 && (attendees < 11 || attendees > 20)) {
        alert("For areas with a capacity of 20, the number of attendees must be between 11 and 20.");
        return false;
    }
    if (capacity === 50 && (attendees < 21 || attendees > 50)) {
        alert("For areas with a capacity of 50, the number of attendees must be between 21 and 50.");
        return false;
    }
    return true;
}

// Calculate the difference in days between two dates
function calculateDaysDifference(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate - startDate;
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// Confirm the booking with proper validation
function confirmBooking() {
    const checkinDate = document.getElementById('checkin').value;
    const checkoutDate = document.getElementById('checkout').value;
    const attendees = document.getElementById('attendees').value.trim();

    // Check if check-in, check-out, and attendees are valid
    if (!checkinDate) {
        alert("Error: Please select a check-in date.");
        return;
    }

    if (!checkoutDate) {
        alert("Error: Please select a check-out date.");
        return;
    }

    if (!attendees || attendees <= 0) {
        alert("Error: Please enter a valid number of attendees.");
        return;
    }

    // Check if an area is selected
    const selectedArea = document.querySelector('.area.selected');
    if (!selectedArea) {
        alert("Error: Please select an area before confirming your booking.");
        return;
    }

    if (!validateAttendees(selectedArea.dataset.capacity, attendees)) {
        return;
    }

    // If all fields are valid, confirm booking
    const confirmation = confirm("Are you sure you want to confirm this booking?");
    if (confirmation) {
        alert("Booking confirmed successfully!");

        // Disable the selected area and make it unavailable
        selectedArea.classList.remove('available');
        selectedArea.classList.add('unavailable');
        selectedArea.removeEventListener('click', selectArea);
        selectedArea.style.pointerEvents = 'none'; // Disable clicking

        // Hide tooltip when area becomes unavailable
        selectedArea.addEventListener('mouseover', function () {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });

        setTimeout(function () {
            location.reload(); // Refresh the page after booking confirmation
        }, 3000); // 3 seconds delay
    }
}

// Update the booking with new details without changing the selected area
function updateBooking(event) {
    event.preventDefault(); // Prevent the page from reloading when update is clicked

    const checkinDate = document.getElementById('checkin').value;
    const checkoutDate = document.getElementById('checkout').value;
    const attendees = document.getElementById('attendees').value.trim();

    // Check if check-in, check-out, and attendees are valid
    if (!checkinDate || !checkoutDate || !attendees || attendees <= 0) {
        alert("Error: Please complete all fields correctly before updating your booking.");
        return;
    }

    // Get the selected area
    const selectedArea = document.querySelector('.area.selected');
    if (!selectedArea) {
        alert("Error: Please select an area before updating your booking.");
        return;
    }

    if (!validateAttendees(selectedArea.dataset.capacity, attendees)) {
        return;
    }

    const totalDays = calculateDaysDifference(checkinDate, checkoutDate);
    if (totalDays < 1) {
        alert("Check-out date must be later than the check-in date.");
        return;
    }

    const totalCost = totalDays * selectedArea.dataset.cost;

    // Update the booking summary with the new details
    document.getElementById('summary-details').innerHTML = `
        Arrival Date: ${new Date(checkinDate).toDateString()}<br>
        Leave Date: ${new Date(checkoutDate).toDateString()}<br>
        Selected Area Number: ${selectedArea.dataset.id}<br>
        Cost per Day: $${selectedArea.dataset.cost}<br>
        Total Cost: $${totalCost} for ${totalDays} days<br>
        Maximum Capacity: ${selectedArea.dataset.capacity}<br>
        Number of Attendees: ${attendees}
    `;
}


// Coded with stac overflow 
// Filter areas by capacity based on the number of attendees entered
function filterAreasByCapacity(event) {
    event.preventDefault(); // Prevent form from submitting

    const attendees = parseInt(document.getElementById('attendees').value.trim(), 10);

    if (attendees <= 0 || isNaN(attendees)) {
        alert("Please enter a valid number of attendees.");
        return;
    } else if (attendees > 50) {
        alert("Only up to 50 attendees are allowed. Please reduce the number of attendees.");
        return;
    }

    const areas = document.querySelectorAll('.area');
    areas.forEach(function (area) {
        const capacity = parseInt(area.dataset.capacity, 10);

        if (
            (attendees <= 5 && capacity <= 5) ||
            (attendees >= 6 && attendees <= 10 && capacity === 10) ||
            (attendees >= 11 && attendees <= 20 && capacity === 20) ||
            (attendees >= 21 && attendees <= 50 && capacity === 50)
        ) {
            area.style.display = 'block';
        } else {
            area.style.display = 'none';
        }
    });
}
