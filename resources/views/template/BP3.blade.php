<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <title>{{ $perihal ?? 'Surat Permohonan Pelaksanaan Pelatihan' }}</title>
    <style>
        @page {
            size: A4;
            margin: 2.5cm 2cm;
        }

        body {
            font-family: 'Calibri', Arial, sans-serif;
            font-size: 12pt;
            color: #000;
            line-height: 1.5;
        }

        .header {
            margin-bottom: 30px;
        }

        .header .logo {
            font-size: 22pt;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: -0.5px;
        }

        .header .logo-sub {
            font-size: 11pt;
            font-weight: 700;
            letter-spacing: 6px;
            color: #00A99D;
            margin-top: -4px;
        }

        .surat-info {
            margin: 20px 0;
        }

        .surat-info table {
            border-collapse: collapse;
        }

        .surat-info td {
            vertical-align: top;
            padding: 1px 0;
        }

        .surat-info td.label {
            width: 90px;
        }

        .surat-info td.colon {
            width: 15px;
        }

        .tanggal-surat {
            text-align: left;
            margin-bottom: 15px;
        }

        .tujuan {
            margin: 20px 0;
        }

        .isi p {
            text-align: justify;
            margin: 14px 0;
        }

        .daftar-lampiran {
            margin: 8px 0 8px 0;
            padding-left: 0;
            list-style-position: inside;
        }

        .daftar-lampiran li {
            margin-bottom: 4px;
        }

        strong.uppercase {
            text-transform: uppercase;
        }
    </style>
</head>

<body>

    {{-- ==================== KOP SURAT ==================== --}}
    <div class="header">
        <div class="logo">{{ $nama_perusahaan ?? 'InJourney' }}</div>
        <div class="logo-sub">{{ $nama_unit ?? 'AIRPORTS' }}</div>
    </div>

    {{-- ==================== TANGGAL ==================== --}}
    <div class="tanggal-surat">
        {{ $tempat_surat ?? 'Tangerang' }}, {{ $tanggal_surat ?? now()->translatedFormat('d F Y') }}
    </div>

    {{-- ==================== NOMOR / LAMPIRAN / PERIHAL ==================== --}}
    <div class="surat-info">
        <table>
            <tr>
                <td class="label">Nomor</td>
                <td class="colon">:</td>
                <td>{{ $nomor_surat }}</td>
            </tr>
            <tr>
                <td class="label">Lampiran</td>
                <td class="colon">:</td>
                <td>{{ $lampiran ?? '1 Berkas' }}</td>
            </tr>
            <tr>
                <td class="label">Perihal</td>
                <td class="colon">:</td>
                <td><strong>{{ $perihal ?? 'Permohonan Pelaksanaan Pelatihan' }}</strong></td>
            </tr>
        </table>
    </div>

    {{-- ==================== TUJUAN SURAT ==================== --}}
    <div class="tujuan">
        Kepada Yth.<br>
        <strong class="uppercase">{{ $tujuan_jabatan }}</strong><br>
        Di -<br>
        TEMPAT
    </div>

    {{-- ==================== ISI SURAT ==================== --}}
    <div class="isi">
        <p>
            Menindaklanjuti {{ $dasar_kerjasama ?? 'Perjanjian Kerjasama' }} Antara {{ $pihak_pertama }} dan
            {{ $pihak_kedua }} Nomor {{ $nomor_pks_1 }}; {{ $nomor_pks_2 }}
            Tentang {{ $judul_kerjasama }}, bersama ini disampaikan permohonan
            pelaksanaan {{ $nama_pelatihan }} bagi karyawan di lingkungan {{ $lingkup_karyawan }}.
        </p>

        <p>
            Kepada {{ $nama_penyelenggara }} dimohon agar dapat melaksanakan
            Pekerjaan {{ $nama_pekerjaan }}, dengan daftar peserta sebagaimana terlampir.
            Sedangkan untuk proses pembayaran dilakukan setelah pekerjaan selesai, dengan melampirkan data
            dukung sebagai berikut :
        </p>

        <ol class="daftar-lampiran">
            @forelse($dokumen_pendukung ?? [
                    'Surat Permohonan Pembayaran',
                    'Invoice',
                    'Kuitansi',
                    'Laporan Pelaksanaan Pelatihan',
                    'Berita Acara Pemeriksaan Pekerjaan dan Berita Acara Serah Terima Pekerjaan',
                ] as $dokumen)
                    <li>{{ $dokumen }};</li>
            @empty
                <li>-</li>

             @endforelse
        </ol>

        <p>Demikian disampaikan, atas perhatian dan kerja samanya diucapkan terima kasih.</p>
    </div>

</body>
</html>