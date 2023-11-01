from flask import Flask, render_template
import csv


DIRECTORY_CARD_FORMAT = True
DISPLAYED_ROSTER_COLS = ['lname', 'fname', 'gradelevel', 'parents', 'church affiliation']


app = Flask(__name__)


## Access and process data
# Build roster from csv
with open('SchoolRoster1_10_30_2023.csv', 'r') as f:
    reader = csv.reader(f)
    roster = [row for row in reader]
    if 'FullName' in roster[0][0]:
        roster[0][0] = 'FullName'
    else:
        raise ValueError('FullName was not in first column name!')
    col_headers = roster[0]
    col_headers = [col_header.lower() for col_header in col_headers]
    del roster[0]
    dict_roster = []
    for row in roster:
        student_dict = {}
        for col_header in col_headers:
            student_dict[col_header] = row[col_headers.index(col_header)]
        dict_roster.append(student_dict)
    roster = dict_roster
    # format parents string
    for student in roster:
        student['parents'] = student['lname'] + ', ' + student['father'].replace(student['lname'], '') + ' & ' + student['mother'].replace(student['lname'], '')
# Build list of families
families = []
for student in roster:
    family_exists = False
    for family in families:
        if family['parents'] == student['parents']:
            family['children'].append(student)
            family_exists = True
            break
    if not family_exists:
        families.append({
            'parents': student['parents'],
            'street': student['street'],
            'city': student['city'],
            'state': student['state'],
            'zip': student['zip'],
            'phone1': student['phone1'],
            'phone2': student['phone2'],
            'email1': student['email1'],
            'email2': student['email2'],
            'church affiliation': student['church affiliation'],
            'children': [student]
        })


## Routes

@app.route('/')
@app.route('/directory')
def directory():
    return render_template('directory.html', families=families, card_format=DIRECTORY_CARD_FORMAT)


@app.route('/roster')
def roster_page():
    return render_template('roster.html', roster=roster, displayed_cols=DISPLAYED_ROSTER_COLS)


if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0', debug=True)
