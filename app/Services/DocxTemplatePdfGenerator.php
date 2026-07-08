<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;
use ZipArchive;

class DocxTemplatePdfGenerator
{
    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    public function generateDocx(string $templateKey, array $values): string
    {
        $templatePath = $this->templatePath($templateKey);

        $workDirectory = storage_path('app/generated/template-letters/'.strtolower($templateKey).'-'.now()->format('YmdHis').'-'.bin2hex(random_bytes(3)));
        File::ensureDirectoryExists($workDirectory);

        $docxPath = $workDirectory.'/hasil.docx';

        File::copy($templatePath, $docxPath);
        $this->fillDocx($docxPath, $values);

        return $docxPath;
    }

    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    public function generatePdf(string $templateKey, array $values): string
    {
        $docxPath = $this->generateDocx($templateKey, $values);
        $workDirectory = dirname($docxPath);
        $pdfPath = $workDirectory.'/hasil.pdf';

        $this->convertToPdf($docxPath, $workDirectory, $pdfPath, $values);

        if (! File::exists($pdfPath)) {
            throw new RuntimeException('PDF converter selesai dijalankan, tapi file PDF tidak terbentuk.');
        }

        return $pdfPath;
    }

    private function templatePath(string $templateKey): string
    {
        $fileName = strtoupper($templateKey).'.docx';
        $paths = [
            storage_path('app/template/'.$fileName),
            storage_path('app/templates/'.$fileName),
        ];

        foreach ($paths as $path) {
            if (File::exists($path)) {
                return $path;
            }
        }

        throw new RuntimeException('Template DOCX tidak ditemukan. Lokasi yang dicek: '.implode(', ', $paths));
    }

    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    private function fillDocx(string $docxPath, array $values): void
    {
        $zip = new ZipArchive;

        if ($zip->open($docxPath) !== true) {
            throw new RuntimeException('Gagal membuka template DOCX.');
        }

        foreach ($this->documentParts($zip) as $partName) {
            $xml = $zip->getFromName($partName);

            if ($xml === false) {
                continue;
            }

            $zip->addFromString($partName, $this->replaceTemplateValues($xml, $values));
        }

        $zip->close();
    }

    /**
     * @return list<string>
     */
    private function documentParts(ZipArchive $zip): array
    {
        $parts = [];

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $name = $zip->getNameIndex($index);

            if ($name === false) {
                continue;
            }

            if (preg_match('/^word\/(document|header\d+|footer\d+)\.xml$/', $name) === 1) {
                $parts[] = $name;
            }
        }

        return $parts;
    }

    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    private function replaceTemplateValues(string $xml, array $values): string
    {
        $xml = $this->replacePlaceholders($xml, $values);

        $document = new \DOMDocument;
        $document->preserveWhiteSpace = true;
        $document->formatOutput = false;

        if (! $document->loadXML($xml)) {
            return $xml;
        }

        $xpath = new \DOMXPath($document);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

        $seenDate = false;
        $seenNumber = false;

        /** @var \DOMElement $run */
        foreach ($xpath->query('//w:r') as $run) {
            $text = '';
            foreach ($xpath->query('w:t', $run) as $textNode) {
                $text .= $textNode->textContent;
            }

            $trimmed = trim($text);

            if ($trimmed === 'Tangerang,') {
                $seenDate = true;
                $this->replaceRunText($document, $xpath, $run, $values['tanggal_surat']);
                $this->removeMarkerFormatting($xpath, $run);

                continue;
            }

            if ($seenDate && ($trimmed === '01' || $trimmed === 'Juli' || $trimmed === '2026')) {
                $this->replaceRunText($document, $xpath, $run, '');
                if ($trimmed === '2026') {
                    $seenDate = false;
                }

                continue;
            }

            if (str_starts_with($trimmed, 'API.17610')) {
                $seenNumber = true;
                $this->replaceRunText($document, $xpath, $run, $values['nomor']);
                $this->removeMarkerFormatting($xpath, $run);

                continue;
            }

            if ($seenNumber && ($trimmed === 'I-' || $trimmed === 'B')) {
                $this->replaceRunText($document, $xpath, $run, '');
                if ($trimmed === 'B') {
                    $seenNumber = false;
                }

                continue;
            }

            if (str_contains($trimmed, 'HK.201/1/7/BP3C/2026')) {
                $this->replaceRunText($document, $xpath, $run, $values['isi']);
                $this->removeMarkerFormatting($xpath, $run);

                continue;
            }
        }

        return $document->saveXML() ?: $xml;
    }

    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    private function replacePlaceholders(string $xml, array $values): string
    {
        $replacements = [
            '${nomor}' => $values['nomor'],
            '${nomor_surat}' => $values['nomor'],
            '${isi}' => $values['isi'],
            '${isi_surat}' => $values['isi'],
            '${tanggal}' => $values['tanggal_surat'],
            '${tanggal_surat}' => $values['tanggal_surat'],
            '{{nomor}}' => $values['nomor'],
            '{{nomor_surat}}' => $values['nomor'],
            '{{isi}}' => $values['isi'],
            '{{isi_surat}}' => $values['isi'],
            '{{tanggal}}' => $values['tanggal_surat'],
            '{{tanggal_surat}}' => $values['tanggal_surat'],
        ];

        foreach ($replacements as $search => $replace) {
            $xml = str_replace($search, htmlspecialchars($replace, ENT_XML1 | ENT_COMPAT, 'UTF-8'), $xml);
        }

        return $xml;
    }

    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    private function replacementForMarker(string $markerText, array $values): ?string
    {
        $normalized = str($markerText)->lower()->toString();

        return match (true) {
            str_contains($normalized, 'tanggal') => $values['tanggal_surat'],
            str_contains($normalized, 'nomor') => $values['nomor'],
            str_contains($normalized, 'isi') => $values['isi'],
            default => null,
        };
    }

    private function runText(\DOMXPath $xpath, \DOMElement $run): string
    {
        $text = '';

        /** @var \DOMElement $textNode */
        foreach ($xpath->query('.//w:t', $run) as $textNode) {
            $text .= $textNode->textContent;
        }

        return $text;
    }

    private function removeMarkerFormatting(\DOMXPath $xpath, \DOMElement $run): void
    {
        /** @var \DOMElement $formattingNode */
        foreach ($xpath->query('./w:rPr/w:i | ./w:rPr/w:iCs | ./w:rPr/w:b | ./w:rPr/w:bCs', $run) as $formattingNode) {
            $formattingNode->parentNode?->removeChild($formattingNode);
        }
    }

    private function replaceRunText(\DOMDocument $document, \DOMXPath $xpath, \DOMElement $run, string $replacement): void
    {
        /** @var \DOMNode $node */
        foreach ($xpath->query('./w:t | ./w:br', $run) as $node) {
            $run->removeChild($node);
        }

        $lines = preg_split('/\R/', $replacement) ?: [''];

        foreach ($lines as $index => $line) {
            if ($index > 0) {
                $run->appendChild($document->createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:br'));
            }

            $textNode = $document->createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:t');
            $textNode->setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
            $textNode->appendChild($document->createTextNode($line));
            $run->appendChild($textNode);
        }
    }

    private function convertToPdf(string $docxPath, string $outputDirectory, string $pdfPath, array $values): void
    {
        $soffice = $this->findLibreOfficeExecutable();

        if ($soffice !== null) {
            $process = new Process([
                $soffice,
                '--headless',
                '--convert-to',
                'pdf',
                '--outdir',
                str_replace('/', '\\', $outputDirectory),
                str_replace('/', '\\', $docxPath),
            ], null, $this->windowsAutomationEnvironment());
            $process->setTimeout(60);
            $process->run();

            if (! $process->isSuccessful()) {
                throw new RuntimeException('Gagal convert DOCX ke PDF: '.$process->getErrorOutput().$process->getOutput());
            }

            return;
        }

        if ($this->findCscriptExecutable() !== null) {
            try {
                $this->convertToPdfWithMicrosoftWord($docxPath, $outputDirectory, $pdfPath);

                return;
            } catch (RuntimeException $exception) {
                File::put($outputDirectory.'/conversion-fallback.txt', $exception->getMessage());
            }
        }

        $this->writeFallbackPdf($pdfPath, $values);
    }

    private function convertToPdfWithMicrosoftWord(string $docxPath, string $outputDirectory, string $pdfPath): void
    {
        $cscript = $this->findCscriptExecutable();

        if ($cscript === null) {
            throw new RuntimeException('cscript.exe tidak ditemukan untuk menjalankan Microsoft Word PDF converter.');
        }

        $scriptPath = $outputDirectory.'/convert-to-pdf.vbs';
        File::put($scriptPath, <<<'VBSCRIPT'
Option Explicit

Dim docxPath, pdfPath, word, document

docxPath = WScript.Arguments.Item(0)
pdfPath = WScript.Arguments.Item(1)

On Error Resume Next
Set word = CreateObject("Word.Application")
If Err.Number <> 0 Then
    WScript.StdErr.WriteLine "CreateObject Word.Application failed: " & Err.Description
    WScript.Quit 1
End If
On Error GoTo 0

word.Visible = False
word.DisplayAlerts = 0

On Error Resume Next
Set document = word.Documents.Open(docxPath, False, True)
If Err.Number <> 0 Then
    WScript.StdErr.WriteLine "Open DOCX failed: " & Err.Description
    word.Quit
    WScript.Quit 1
End If

Err.Clear
document.ExportAsFixedFormat pdfPath, 17
If Err.Number <> 0 Then
    WScript.StdErr.WriteLine "Export PDF failed: " & Err.Description
    document.Close False
    word.Quit
    WScript.Quit 1
End If
On Error GoTo 0

document.Close False
word.Quit
WScript.Quit 0
VBSCRIPT);

        $winScriptPath = str_replace('/', '\\', $scriptPath);
        $winDocxPath = str_replace('/', '\\', $docxPath);
        $winPdfPath = str_replace('/', '\\', $pdfPath);

        $process = new Process([
            $cscript,
            '//Nologo',
            $winScriptPath,
            $winDocxPath,
            $winPdfPath,
        ], null, $this->windowsAutomationEnvironment());
        $process->setTimeout(90);
        $process->run();

        if (! $process->isSuccessful() || ! File::exists($pdfPath)) {
            $output = trim($process->getErrorOutput().$process->getOutput());
            File::put($outputDirectory.'/conversion-output.txt', $output);

            throw new RuntimeException('Gagal convert DOCX ke PDF via Microsoft Word: '.$output);
        }
    }

    /**
     * @param  array{nomor: string, isi: string, tanggal_surat: string}  $values
     */
    private function writeFallbackPdf(string $pdfPath, array $values): void
    {
        $lines = [
            $values['tanggal_surat'],
            '',
            'Nomor      : '.$values['nomor'],
            'Lampiran   : 1 Berkas',
            'Perihal    : Permohonan Pelaksanaan Pelatihan',
            '',
            'Kepada Yth.',
            'KELAPA BALAI PENDIDIKAN DAN PELATIHAN PENERBANGAN (BP3) CURUG',
            'Di -',
            'TEMPAT',
            '',
            ...$this->wrapPdfText($values['isi'] !== '' ? $values['isi'] : 'Isi surat belum diisi.', 92),
        ];

        $content = "BT\n/F1 11 Tf\n52 790 Td\n14 TL\n";

        foreach ($lines as $line) {
            $content .= '('.$this->escapePdfText($line).") Tj\nT*\n";
        }

        $content .= "ET\n";

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($content)." >>\nstream\n{$content}endstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $objectNumber = $index + 1;
            $pdf .= "{$objectNumber} 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";

        foreach ($offsets as $offset) {
            $pdf .= str_pad((string) $offset, 10, '0', STR_PAD_LEFT)." 00000 n \n";
        }

        $pdf .= "trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";

        File::put($pdfPath, $pdf);
    }

    /**
     * @return list<string>
     */
    private function wrapPdfText(string $text, int $width): array
    {
        $lines = [];

        foreach (preg_split('/\R/', $text) ?: [] as $paragraph) {
            $wrapped = wordwrap($paragraph, $width, "\n", false);
            array_push($lines, ...explode("\n", $wrapped));
        }

        return $lines;
    }

    private function escapePdfText(string $text): string
    {
        $encoded = mb_convert_encoding($text, 'Windows-1252', 'UTF-8');

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $encoded);
    }

    private function windowsAutomationEnvironment(): array
    {
        return [
            'SystemRoot' => getenv('SystemRoot') ?: 'C:\\Windows',
            'WINDIR' => getenv('WINDIR') ?: 'C:\\Windows',
            'USERPROFILE' => getenv('USERPROFILE') ?: 'C:\\Users\\Hokiana',
            'APPDATA' => getenv('APPDATA') ?: 'C:\\Users\\Hokiana\\AppData\\Roaming',
            'LOCALAPPDATA' => getenv('LOCALAPPDATA') ?: 'C:\\Users\\Hokiana\\AppData\\Local',
            'TEMP' => getenv('TEMP') ?: 'C:\\tmp',
            'TMP' => getenv('TMP') ?: 'C:\\tmp',
            'PATH' => getenv('PATH') ?: 'C:\\Windows\\system32;C:\\Windows',
        ];
    }

    private function findLibreOfficeExecutable(): ?string
    {
        $candidates = [
            'soffice',
            'libreoffice',
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        ];

        foreach ($candidates as $candidate) {
            if (str_contains($candidate, '\\') && File::exists($candidate)) {
                return $candidate;
            }

            if (! str_contains($candidate, '\\') && $this->commandExists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function findCscriptExecutable(): ?string
    {
        $candidates = [
            'cscript',
            'cscript.exe',
            'C:\\Windows\\System32\\cscript.exe',
        ];

        foreach ($candidates as $candidate) {
            if (str_contains($candidate, '\\') && File::exists($candidate)) {
                return $candidate;
            }

            if (! str_contains($candidate, '\\') && $this->commandExists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function findPowerShellExecutable(): ?string
    {
        $candidates = [
            'powershell',
            'powershell.exe',
            'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        ];

        foreach ($candidates as $candidate) {
            if (str_contains($candidate, '\\') && File::exists($candidate)) {
                return $candidate;
            }

            if (! str_contains($candidate, '\\') && $this->commandExists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function commandExists(string $command): bool
    {
        $process = new Process(['where', $command]);
        $process->run();

        return $process->isSuccessful();
    }
}
