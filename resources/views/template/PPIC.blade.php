<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surat Permohonan PPIC</title>
    <style>
        /* Gaya standar untuk cetak dokumen resmi / PDF */
        body { 
            font-family: "Times New Roman", Times, serif; 
            margin: 0 auto; 
            padding: 30px; 
            max-width: 800px; 
            line-height: 1.5; 
            color: #000;
        }
        .kop-surat { 
            text-align: center; 
            border-bottom: 3px solid black; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
            position: relative;
        }
        .kop-surat img { 
            max-width: 80px; 
            position: absolute; 
            left: 0; 
            top: 0; 
        }
        .kop-surat h1 { 
            margin: 0; 
            font-size: 22px; 
            text-transform: uppercase; 
        }
        .kop-surat p { 
            margin: 2px 0; 
            font-size: 14px; 
        }
        .judul-surat { 
            text-align: center; 
            font-weight: bold; 
            text-decoration: underline; 
            margin: 20px 0 30px 0; 
            font-size: 18px;
        }
        .meta-surat, .data-personel {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }
        .meta-surat td, .data-personel td {
            vertical-align: top;
            padding: 2px 5px;
        }
        .col-label { width: 25%; }
        .col-separator { width: 2%; text-align: center; }
        .col-value { width: 73%; }
        
        .tabel-lampiran { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            margin-bottom: 20px;
        }
        .tabel-lampiran th, .tabel-lampiran td { 
            border: 1px solid black; 
            padding: 8px; 
            text-align: left; 
        }
        .tabel-lampiran th { background-color: #f2f2f2; }
        
        .ttd-container { 
            margin-top: 40px; 
            width: 100%;
        }
        .ttd-box {
            float: right;
            text-align: left;
            width: 300px;
        }
        .ttd-nama { 
            margin-top: 70px; 
            font-weight: bold; 
            text-decoration: underline; 
        }
        .clear { clear: both; }
        
        .btn-link { color: blue; text-decoration: underline; }
    </style>
</head>
<body>

    <div class="kop-surat">
        <img src="{{ asset('logo.png') }}" alt="LOGO">
        <h1>{{ $nama_perusahaan }}</h1>
        <p>{{ $alamat_perusahaan }}</p>
        <p>Telp. {{ $telepon }} | Email: {{ $email }} | Website: {{ $website }}</p>
    </div>

    <div class="judul-surat">SURAT PERMOHONAN PPIC</div>

    <table class="meta-surat">
        <tr>
            <td class="col-label">Nomor</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $nomor_surat }}</td>
        </tr>
        <tr>
            <td class="col-label">Lampiran</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $jumlah_lampiran }} berkas</td>
        </tr>
        <tr>
            <td class="col-label">Perihal</td>
            <td class="col-separator">:</td>
            <td class="col-value">Permohonan {{ $jenis_permohonan_ppic }} PPIC</td>
        </tr>
    </table>

    <p>Kepada Yth.<br>
    <strong>{{ $tujuan_surat_ppic }}</strong><br>
    di {{ $tempat_tujuan }}</p>

    <p>Dengan hormat,</p>
    <p>Berdasarkan kebutuhan operasional dan pemenuhan dokumen administrasi personel, bersama ini kami mengajukan permohonan {{ $jenis_permohonan_ppic }} PPIC untuk personel berikut:</p>

    <table class="data-personel">
        <tr>
            <td class="col-label">Nama</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $nama_personel }}</td>
        </tr>
        <tr>
            <td class="col-label">NIP/ID</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $nip_personel }}</td>
        </tr>
        <tr>
            <td class="col-label">Jabatan</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $jabatan_personel }}</td>
        </tr>
        <tr>
            <td class="col-label">Unit Kerja</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $unit_kerja }}</td>
        </tr>
        <tr>
            <td class="col-label">Lokasi Penugasan</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $lokasi_penugasan }}</td>
        </tr>
        <tr>
            <td class="col-label">Periode Kebutuhan</td>
            <td class="col-separator">:</td>
            <td class="col-value">{{ $periode_kebutuhan }}</td>
        </tr>
    </table>

    <p>Permohonan ini digunakan untuk {{ $keperluan_ppic }}. Seluruh data dan dokumen pendukung yang disampaikan telah diperiksa sesuai kelengkapan administrasi yang berlaku.</p>

    <p><strong>Daftar Lampiran</strong></p>
    <table class="tabel-lampiran">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="55%">Dokumen</th>
                <th width="40%">Status / Link File</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>Pas Foto JPG</td>
                <td><a href="{{ $link_pas_foto_jpg }}" class="btn-link">Lihat Dokumen</a></td>
            </tr>
            <tr>
                <td>2</td>
                <td>KTP PDF</td>
                <td><a href="{{ $link_ktp_pdf }}" class="btn-link">Lihat Dokumen</a></td>
            </tr>
            <tr>
                <td>3</td>
                <td>Daftar Riwayat Hidup</td>
                <td><a href="{{ $link_daftar_riwayat_hidup }}" class="btn-link">Lihat Dokumen</a></td>
            </tr>
            <tr>
                <td>4</td>
                <td>Buku Lisensi</td>
                <td><a href="{{ $link_buku_lisensi }}" class="btn-link">Lihat Dokumen</a></td>
            </tr>
            <tr>
                <td>5</td>
                <td>Sertifikat Kompetensi Initial</td>
                <td><a href="{{ $link_sertifikat_kompetensi_initial }}" class="btn-link">Lihat Dokumen</a></td>
            </tr>
            <tr>
                <td>6</td>
                <td>Sertifikat Refresher Terakhir</td>
                <td><a href="{{ $link_sertifikat_refresher_terakhir }}" class="btn-link">Lihat Dokumen</a></td>
            </tr>
            <tr>
                <td>7</td>
                <td>Nomor WA</td>
                <td>
                    @if(filter_var($link_nomor_wa, FILTER_VALIDATE_URL))
                        <a href="{{ $link_nomor_wa }}" class="btn-link">Hubungi WA</a>
                    @else
                        {{ $link_nomor_wa }}
                    @endif
                </td>
            </tr>
        </tbody>
    </table>

    <p>Demikian surat ini dibuat agar dapat diproses sebagaimana mestinya. Atas perhatian dan bantuan Bapak/Ibu, kami ucapkan terima kasih.</p>

    <div class="ttd-container">
        <div class="ttd-box">
            <p>{{ $kota }}, {{ $tanggal_surat }}<br>
            {{ $jabatan_penandatangan }}</p>
            
            <div class="ttd-nama">{{ $nama_penandatangan }}</div>
            <div>NIP/ID. {{ $nip_penandatangan }}</div>
        </div>
        <div class="clear"></div>
    </div>

</body>
</html>