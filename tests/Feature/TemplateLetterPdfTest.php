<?php

namespace Tests\Feature;

use App\Services\DocxTemplatePdfGenerator;
use Mockery;
use Mockery\MockInterface;
use RuntimeException;

function fakeTemplateOutput(string $fileName, string $contents): string
{
    $path = storage_path('framework/testing/'.$fileName);

    if (! is_dir(dirname($path))) {
        mkdir(dirname($path), 0777, true);
    }

    file_put_contents($path, $contents);

    return $path;
}

it('renders a BP3 PDF from the docx template generator', function () {
    $pdfPath = fakeTemplateOutput('bp3-preview.pdf', "%PDF-1.4\n% Test PDF\n");

    $this->mock(DocxTemplatePdfGenerator::class, function (MockInterface $mock) use ($pdfPath) {
        $mock->shouldReceive('generatePdf')
            ->once()
            ->with('bp3', Mockery::on(fn (array $values): bool => $values['nomor'] === 'BP3/001/PPIC/VII/2026'
                && $values['isi'] === 'Isi surat yang bisa diubah'
                && str_starts_with($values['tanggal_surat'], 'Tangerang, ')))
            ->andReturn($pdfPath);
    });

    $response = $this->get(route('template-surat.pdf', [
        'template' => 'bp3',
        'number' => 'BP3/001/PPIC/VII/2026',
        'body' => 'Isi surat yang bisa diubah',
    ]));

    $response->assertSuccessful();
    $response->assertHeader('content-type', 'application/pdf');
});

it('downloads a BP3 PDF from the docx template generator', function () {
    $pdfPath = fakeTemplateOutput('bp3-download.pdf', "%PDF-1.4\n% Test PDF\n");

    $this->mock(DocxTemplatePdfGenerator::class, function (MockInterface $mock) use ($pdfPath) {
        $mock->shouldReceive('generatePdf')
            ->once()
            ->andReturn($pdfPath);
    });

    $response = $this->get(route('template-surat.pdf', [
        'template' => 'bp3',
        'number' => 'BP3/001/PPIC/VII/2026',
        'body' => 'Isi surat yang bisa diubah',
        'download' => true,
    ]));

    $response->assertSuccessful();
    $response->assertDownload('BP3.pdf');
});

it('returns service unavailable when BP3 PDF conversion is unavailable', function () {
    $this->mock(DocxTemplatePdfGenerator::class, function (MockInterface $mock) {
        $mock->shouldReceive('generatePdf')
            ->once()
            ->andThrow(new RuntimeException('PDF converter tidak ditemukan.'));
    });

    $response = $this->get(route('template-surat.pdf', [
        'template' => 'bp3',
        'number' => 'BP3/001/PPIC/VII/2026',
        'body' => 'Isi surat yang bisa diubah',
    ]));

    $response->assertServiceUnavailable();
});

it('renders the PPIC printable letter from the blade template', function () {
    $response = $this->get(route('template-surat.pdf', [
        'template' => 'ppic',
        'number' => 'PPIC/001/PPIC/VII/2026',
    ]));

    $response->assertSuccessful();
    $response->assertSee('PPIC/001/PPIC/VII/2026', false);
    $response->assertSee('Injourney Airports', false);
});

it('validates template letter input', function () {
    $response = $this->get(route('template-surat.pdf', [
        'template' => 'invalid-template',
        'number' => str_repeat('A', 121),
        'download' => 'not-boolean',
    ]));

    $response->assertSessionHasErrors(['template', 'number', 'download']);
});
