#include <iostream>
#include <map>
#include <vector>
#include <sstream>
#include <iomanip>
#include <cmath>
using namespace std;

struct Room {
    int capacity;
    int weekday_rate;
    string status = "vacant";
    string guest_id = "";
    string checkout_time = "";
    int cleaning_time = 0;
    int occupied_nights = 0;
    int adults = 0;
    int children = 0;
    string cleaning_completion_time = "";
};

map<int, Room> rooms;

// Corrected addTime function
string addTime(const string& timestamp, int minutes) {
    tm tm = {};
    istringstream ss(timestamp);
    ss >> get_time(&tm, "%Y-%m-%dT%H:%M:%S");
    time_t t = mktime(&tm);
    t += minutes * 60; // Add minutes
    tm = *localtime(&t);
    ostringstream oss;
    oss << put_time(&tm, "%Y-%m-%dT%H:%M:%S");
    return oss.str();
}

void processCheckIn(const string& timestamp, int room_number, int adults, int children, int nights, const string& guest_id) {
    if (rooms[room_number].status == "cleaning" && timestamp < rooms[room_number].cleaning_completion_time) {
        cout << timestamp << " check-in error: " << room_number << " is being cleaned." << endl;
        return;
    }
    if (rooms[room_number].status != "vacant") {
        cout << timestamp << " check-in error: " << room_number << " is " << rooms[room_number].status << "." << endl;
        return;
    }
    if (adults + children > rooms[room_number].capacity) {
        cout << timestamp << " check-in error: " << room_number << " cannot accommodate " << guest_id << "." << endl;
        return;
    }
    rooms[room_number].status = "occupied";
    rooms[room_number].guest_id = guest_id;
    rooms[room_number].occupied_nights = nights;
    rooms[room_number].adults = adults;
    rooms[room_number].children = children;
    cout << timestamp << " check-in " << guest_id << " successfully checked in to " << room_number << "." << endl;
}

void processCheckOut(const string& timestamp, const string& guest_id, int room_number, int cleaning_time) {
    if (rooms[room_number].guest_id != guest_id) {
        cout << timestamp << " check-out error: " << guest_id << " is not in " << room_number << "." << endl;
        return;
    }
    int total_charge = (rooms[room_number].adults * rooms[room_number].weekday_rate +
                        rooms[room_number].children * ceil(0.8 * rooms[room_number].weekday_rate)) *
                        rooms[room_number].occupied_nights;
    cout << timestamp << " check-out " << guest_id << " has to pay " << total_charge << " to leave " << room_number << "." << endl;
    rooms[room_number].status = "cleaning";
    rooms[room_number].guest_id = "";
    rooms[room_number].cleaning_time = cleaning_time;
    rooms[room_number].occupied_nights = 0;
    rooms[room_number].adults = 0;
    rooms[room_number].children = 0;
    rooms[room_number].cleaning_completion_time = addTime(timestamp, cleaning_time);
    cout << "cleaning of " << room_number << " will be completed at " << rooms[room_number].cleaning_completion_time << "." << endl;
}

int main() {
    int N;
    cin >> N;
    for (int i = 0; i < N; i++) {
        int room_number, capacity, weekday_rate;
        cin >> room_number >> capacity >> weekday_rate;
        rooms[room_number] = {capacity, weekday_rate};
    }
    cin.ignore();
    string line;
    while (getline(cin, line)) {
        istringstream iss(line);
        string timestamp, command;
        iss >> timestamp >> command;
        if (command == "check-in") {
            int room_number, adults, children, nights;
            string guest_id;
            iss >> room_number >> adults >> children >> nights >> guest_id;
            processCheckIn(timestamp, room_number, adults, children, nights, guest_id);
        } else if (command == "check-out") {
            string guest_id;
            int room_number, cleaning_time;
            iss >> guest_id >> room_number >> cleaning_time;
            processCheckOut(timestamp, guest_id, room_number, cleaning_time);
        }
    }
    return 0;
}