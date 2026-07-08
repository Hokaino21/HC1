<?php

namespace App\Http\Controllers;

use App\Services\DocxTemplatePdfGenerator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TemplateLetterController extends Controller
{
    /**
     * @var array<string, array{label: string, view: string|null}>
     */
    private const TEMPLATES = [
        'bp3' => [
            'label' => 'BP3',
            'view' => null,
        ],
        'ppic' => [
            'label' => 'PPIC',
            'view' => 'template.PPIC',
        ],
    ];

    public function pdf(Request $request, DocxTemplatePdfGenerator $docxGenerator): View|BinaryFileResponse
    {
        $validated = $request->validate([
            'template' => ['nullable', 'string', Rule::in(array_keys(self::TEMPLATES))],
            'number' => ['nullable', 'string', 'max:120'],
            'date' => ['nullable', 'string', 'max:120'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:5000'],
            'download' => ['nullable', 'boolean'],
        ]);

        $templateKey = $validated['template'] ?? 'bp3';
        $template = self::TEMPLATES[$templateKey];
        $number = $this->cleanText($validated['number'] ?? 'Nomor surat belum diisi');
        $date = $this->cleanText($validated['date'] ?? 'Tangerang, '.now()->translatedFormat('d F Y'));
        $subject = $this->cleanText($validated['subject'] ?? 'Permohonan Pelaksanaan Pelatihan');
        $body = $this->cleanText($validated['body'] ?? '');

        if ($templateKey === 'bp3') {
            $values = [
                'nomor' => $number,
                'isi' => $body,
                'tanggal_surat' => $date,
            ];

            try {
                $disposition = $request->boolean('download') ? 'attachment' : 'inline';

                return response()->file($docxGenerator->generatePdf($templateKey, $values), [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => $disposition.'; filename="BP3.pdf"',
                ]);
            } catch (RuntimeException $exception) {
                abort(503, $exception->getMessage());
            }
        }

        return view($template['view'], $this->templateData(
            $template['label'],
            $number,
            $subject,
            $body,
        ));
    }

    private function cleanText(string $value): string
    {
        return str($value)
            ->replaceMatches('/\r\n|\r/', "\n")
            ->replaceMatches('/[ \t]+/', ' ')
            ->trim()
            ->toString();
    }

    /**
     * @return array<string, string|int>
     */
    private function templateData(string $templateLabel, string $number, string $subject, string $body): array
    {
        return [
            'jenis_template' => $templateLabel,
            'nomor_surat' => $number,
            'perihal' => $subject,
            'isi_dokumen' => $body,
            'nama_perusahaan' => 'Injourney Airports',
            'nama_unit' => 'AIRPORTS',
            'alamat_perusahaan' => 'Bandar Udara Internasional Soekarno-Hatta, Tangerang',
            'telepon' => '021-5505179',
            'email' => 'hcd@injourneyairports.id',
            'website' => 'www.injourneyairports.id',
            'jumlah_lampiran' => 1,
            'lampiran' => '1 Berkas',
            'jenis_permohonan_bp3' => 'Penerbitan',
            'jenis_permohonan_ppic' => 'Penerbitan',
            'tempat_surat' => 'Tangerang',
            'tujuan_surat_bp3' => 'Kepala Kantor Otoritas Bandar Udara',
            'tujuan_surat_ppic' => 'Manager PPIC',
            'tujuan_jabatan' => 'Executive General Manager Kantor Cabang Utama Bandara Internasional Soekarno-Hatta',
            'tempat_tujuan' => 'Tempat',
            'dasar_kerjasama' => 'Perjanjian Kerjasama',
            'pihak_pertama' => 'PT Angkasa Pura Indonesia',
            'pihak_kedua' => 'penyelenggara pelatihan',
            'nomor_pks_1' => '-',
            'nomor_pks_2' => '-',
            'judul_kerjasama' => 'Pelaksanaan Pelatihan',
            'nama_pelatihan' => 'Diklat Mandatory',
            'lingkup_karyawan' => 'Injourney Airports',
            'nama_penyelenggara' => 'penyelenggara pelatihan',
            'nama_pekerjaan' => 'Pelaksanaan Pelatihan',
            'nama_personel' => 'Yudi Hokiana',
            'nip_personel' => '-',
            'jabatan_personel' => 'Internship',
            'unit_kerja' => 'HC Development',
            'nomor_lisensi' => '-',
            'masa_berlaku' => '-',
            'lokasi_penugasan' => 'REG I',
            'periode_kebutuhan' => '1 Juli - 31 Agustus 2026',
            'keperluan_bp3' => 'kelengkapan administrasi personel',
            'keperluan_ppic' => 'kelengkapan administrasi personel',
            'link_pas_foto_jpg' => '#',
            'link_ktp_pdf' => '#',
            'link_sertifikat_kompetensi' => '#',
            'link_sertifikat_refresher' => '#',
            'link_ijazah_pendidikan_terakhir' => '#',
            'link_skck' => '#',
            'link_background_check' => '#',
            'link_daftar_riwayat_hidup' => '#',
            'link_buku_lisensi' => '#',
            'link_sertifikat_kompetensi_initial' => '#',
            'link_sertifikat_refresher_terakhir' => '#',
            'link_nomor_wa' => '-',
            'kota' => 'Tangerang',
            'tanggal_surat' => 'Tangerang, '.now()->translatedFormat('d F Y'),
            'jabatan_penandatangan' => 'HC Development',
            'nama_penandatangan' => 'Nama Penandatangan',
            'nip_penandatangan' => '-',
        ];
    }
}
