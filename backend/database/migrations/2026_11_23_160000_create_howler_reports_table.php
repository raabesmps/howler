<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Abuse reports. A report stores only the reason and which howler it is about, never the message and never who
     * reported it (no IP, no device). It survives the howler's content but not the howler's tombstone: when the tombstone
     * is purged the howler_id becomes null.
     */
    public function up(): void
    {
        Schema::create('howler_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('howler_id')->nullable()->constrained('howlers')->nullOnDelete();
            $table->string('reason', 16);
            $table->timestampTz('created_at')->useCurrent();
            $table->index('howler_id');
        });

        DB::statement("ALTER TABLE howler_reports ADD CONSTRAINT howler_reports_reason_check CHECK (reason IN ('abuse', 'harassment', 'threat', 'spam', 'other'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('howler_reports');
    }
};
