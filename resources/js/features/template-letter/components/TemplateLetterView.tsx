import React, { useState, FormEvent, Fragment } from 'react';
import { TemplateLetterType } from '@/types/welcome';
import { pdf as templateLetterPdf } from '@/routes/template-surat';
import { DownloadIcon } from '@/features/shared/components/icons';

const templateLetterTypes: Array<{ id: TemplateLetterType; label: string }> = [
    { id: 'bp3', label: 'BP3' },
    { id: 'ppic', label: 'PPIC' },
];

export default function TemplateLetterView() {
    const [draft, setDraft] = useState({
        template: 'bp3' as TemplateLetterType,
        number: 'API.17610/DL.06.01/2026/REG I-B',
        date: 'Tangerang, 01 Juli 2026',
        body: 'HK.201/1/7/BP3C/2026; PJJ.CGR.HCB.0003/DL.06.01/2026',
    });
    const [letter, setLetter] = useState(draft);
    const outputQuery = {
        template: letter.template,
        number: letter.number,
        date: letter.date,
        body: letter.body,
    };
    // const pdfUrl = templateLetterPdf.url({
    //     query: outputQuery,
    // });
    const downloadPdfUrl = templateLetterPdf.url({
        query: {
            ...outputQuery,
            download: true,
        },
    });

    // Template configs for preview
    const templateConfigs: Record<
        TemplateLetterType,
        {
            perihal: string;
            tujuan: string;
            isi: string;
        }
    > = {
        bp3: {
            perihal:
                'Permohonan Pelaksanaan Recurrent Senior Avsec bagi Karyawan Kantor Regional I PT Angkasa Pura Indonesia (Persero)',
            tujuan: 'KEPADA BALAI PENDIDIKAN DAN PELATIHAN PENERBANGAN (BP3) CURUG',
            isi: 'Menindaklanjuti Perjanjian Kerjasama Antara Balai Pendidikan dan Pelatihan Penerbangan Curug dan PT Angkasa Pura Indonesia Kantor Regional I Nomor {isi} Tentang Pelatihan Personel Bidang Bandar Udara (Refreshment) Dan Personel Bidang Keamanan Penerbangan (Recurrent), bersama ini disampaikan permohonan pelaksanaan Pelatihan Recurrent Senior Avsec bagi karyawan di lingkungan Regional I PT Angkasa Pura Indonesia (Persero).',
        },
        ppic: {
            perihal: 'Permohonan Pelaksanaan Pelatihan PPIC',
            tujuan: 'KEPADA PIHAK YANG BERWAJIB',
            isi: 'Menindaklanjuti Perjanjian Kerjasama Antara Pihak Terkait dan PT Angkasa Pura Indonesia Kantor Regional I Nomor {isi} Tentang Pelatihan PPIC, bersama ini disampaikan permohonan pelaksanaan Pelatihan PPIC bagi karyawan di lingkungan Regional I PT Angkasa Pura Indonesia (Persero).',
        },
    };

    const currentConfig =
        templateConfigs[letter.template] || templateConfigs.bp3;

    function updateTemplate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLetter(draft);
    }

    return (
        <section className="flex min-h-full flex-col gap-4">
            <form
                onSubmit={updateTemplate}
                className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
            >
                <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Pilih Template
                        <select
                            value={draft.template}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    template: event.target
                                        .value as TemplateLetterType,
                                }))
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        >
                            {templateLetterTypes.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Nomor Surat
                        <input
                            type="text"
                            value={draft.number}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    number: event.target.value,
                                }))
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Tanggal Surat
                        <input
                            type="text"
                            value={draft.date}
                            placeholder="mis. Tangerang, 01 Juli 2026"
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    date: event.target.value,
                                }))
                            }
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Isi Surat (Nomor PKS)
                        <textarea
                            value={draft.body}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    body: event.target.value,
                                }))
                            }
                            rows={4}
                            className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 transition outline-none focus:border-[#4863df] focus:ring-2 focus:ring-[#4863df]/20"
                        />
                    </label>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4863df] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f57c6]"
                        >
                            Generate Surat
                        </button>
                        <a
                            href={downloadPdfUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#4863df]/30 bg-[#4863df]/5 px-4 text-sm font-semibold text-[#4863df] shadow-sm transition hover:bg-[#4863df]/10"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            Download DOCX
                        </a>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <div className="mx-auto min-h-[520px] max-w-2xl rounded-sm bg-white px-10 py-9 text-sm leading-7 text-slate-800 shadow-sm ring-1 ring-slate-200">
                        {/* Kop Surat */}
                        <div className="mb-5">
                            <div className="text-[22px] leading-tight font-bold tracking-tight text-slate-900">
                                InJourney
                            </div>
                            <div className="text-[11px] font-bold tracking-[6px] text-[#00A99D]">
                                AIRPORTS
                            </div>
                        </div>

                        {/* Tanggal */}
                        <div className="mb-4 text-sm font-normal">
                            {letter.date || 'Tangerang, 01 Juli 2026'}
                        </div>

                        {/* Info Surat */}
                        <table className="mb-5 text-sm">
                            <tbody>
                                <tr>
                                    <td className="w-[90px] align-top">
                                        Nomor
                                    </td>
                                    <td className="w-[15px] align-top">:</td>
                                    <td>{letter.number || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="align-top">Lampiran</td>
                                    <td className="align-top">:</td>
                                    <td>1 Berkas</td>
                                </tr>
                                <tr>
                                    <td className="align-top">Perihal</td>
                                    <td className="align-top">:</td>
                                    <td>{currentConfig.perihal}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Tujuan */}
                        <div className="mb-5 text-sm">
                            <div>Kepada Yth.</div>
                            <div className="font-semibold uppercase">
                                {currentConfig.tujuan}
                            </div>
                            <div>Di -</div>
                            <div>TEMPAT</div>
                        </div>

                        {/* Isi */}
                        <div className="text-justify text-sm leading-7">
                            <p>
                                {(() => {
                                    const parts =
                                        currentConfig.isi.split('{isi}');
                                    const bodyContent =
                                        letter.body ||
                                        'HK.201/1/7/BP3C/2026; PJJ.CGR.HCB.0003/DL.06.01/2026';

                                    return (
                                        <>
                                            {parts[0]}
                                            <span className="bg-yellow-100 px-1">
                                                {bodyContent}
                                            </span>
                                            {parts.slice(1).map((part, i) => (
                                                <Fragment key={i}>
                                                    <span className="bg-yellow-100 px-1">
                                                        {bodyContent}
                                                    </span>
                                                    {part}
                                                </Fragment>
                                            ))}
                                        </>
                                    );
                                })()}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </section>
    );
}
