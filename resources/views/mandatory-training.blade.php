<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $document_title }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
        }
        h1 {
            text-align: center;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 24px;
        }
        .batch-name {
            text-align: left;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #cce5ff;
            font-weight: bold;
            text-transform: uppercase;
        }
        .no-column {
            width: 5%;
            text-align: center;
        }
        .nik-column {
            width: 15%;
        }
        .name-column {
            width: 30%;
        }
        .location-column {
            width: 20%;
        }
        .position-column {
            width: 30%;
        }
    </style>
</head>
<body>
    <h1>{{ $document_title }}</h1>
    <div class="batch-name">{{ $batch_name }}</div>
    <table>
        <thead>
            <tr>
                <th class="no-column">No</th>
                <th class="nik-column">NIK</th>
                <th class="name-column">Nama</th>
                <th class="location-column">Lokasi</th>
                <th class="position-column">Jabatan</th>
            </tr>
        </thead>
        <tbody>
            @foreach($employees as $index => $employee)
                <tr>
                    <td class="no-column">{{ $index + 1 }}</td>
                    <td class="nik-column">{{ $employee['nik'] }}</td>
                    <td class="name-column">{{ $employee['name'] }}</td>
                    <td class="location-column">{{ $employee['location'] ?? '-' }}</td>
                    <td class="position-column">{{ $employee['position'] ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>

