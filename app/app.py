
from flask import Flask, render_template, request
from webui import WebUI  # Needed for flask-desktop
import csv, os


DEFAULT_ROSTER_FILENAME = 'SchoolRoster.csv'
DIRECTORY_CARD_FORMAT = True
DISPLAYED_ROSTER_COLS = ['lname', 'fname', 'gradelevel', 'parents', 'church affiliation']


app = Flask(__name__)
ui = WebUI(app, debug=True) # Create a WebUI instance (needed for flask-desktop)


## Routes

@app.route('/', methods=['GET', 'POST'])
@app.route('/directory', methods=['GET', 'POST'])
def upload_file():
    # Check request method
    if request.method == 'GET':
        return render_template('get_file.html')
    elif request.method == 'POST':
        # Check if file was passed
        if 'file' not in request.files:
            return '<h1>No file given</h1>'
        # Check if filetype is correct
        if not request.files['file'].filename.endswith('.csv'):
            return '<h1>Incorrect filetype. Please upload a .csv file.</h1><br><button class="btn btn-secondary" onclick="history.back()">Go Back</button>'
        # Save file
        request.files['file'].save(os.path.join(app.root_path, DEFAULT_ROSTER_FILENAME))
        ## Access and process data
        # Build roster from csv
        with open(os.path.join(app.root_path, DEFAULT_ROSTER_FILENAME), 'r') as f:
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
        # Delete csv
        os.remove(os.path.join(app.root_path, DEFAULT_ROSTER_FILENAME))
        # Render directory page
        return render_template('directory.html', families=families, card_format=DIRECTORY_CARD_FORMAT)


@app.route('/roster')
def roster_page():
    return render_template('roster.html', roster=ROSTER, displayed_cols=DISPLAYED_ROSTER_COLS)


if __name__ == '__main__':
    # app.run(port=5000, host='0.0.0.0', debug=True)
    ui.run() #replace app.run() with ui.run(), and that's it
