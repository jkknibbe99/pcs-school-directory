import csv

with open('SchoolRoster1_10_30_2023.csv', 'r') as f:
    reader = csv.reader(f)
    roster = [row for row in reader]
    print(len(roster))
