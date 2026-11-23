<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('howlers', function (Blueprint $table) {
            $table->ulid('id')->primary();

            // Only the hash of the link token is stored: a leaked database does not hand out working links.
            $table->char('token_hash', 64)->unique();

            $table->string('recipient_name', 40)->nullable();

            // The content. Both are deleted for good once the howler is burned or expired (see the constraints below).
            $table->string('message', 140)->nullable();
            $table->string('audio_path', 255)->nullable();

            // Which model and voice made the audio, for auditing the tone.
            $table->jsonb('voice_settings')->nullable();

            $table->string('status', 16)->default('sealed');
            $table->timestampTz('expires_at');
            $table->timestampTz('opened_at')->nullable();
            $table->timestampsTz();

            // the scheduled purge looks for sealed howlers past their expiry
            $table->index(['status', 'expires_at']);
        });

        // The rules live in the database too, so no bug in the application can leave a message behind.
        DB::statement("ALTER TABLE howlers ADD CONSTRAINT howlers_status_check CHECK (status IN ('sealed', 'burned', 'expired'))");
        DB::statement("ALTER TABLE howlers ADD CONSTRAINT howlers_sealed_has_message CHECK (status <> 'sealed' OR (message IS NOT NULL AND length(trim(message)) > 0))");
        DB::statement("ALTER TABLE howlers ADD CONSTRAINT howlers_no_content_after_delivery CHECK (status = 'sealed' OR (message IS NULL AND audio_path IS NULL))");
        DB::statement("ALTER TABLE howlers ADD CONSTRAINT howlers_opened_at_only_when_burned CHECK ((status = 'burned') = (opened_at IS NOT NULL))");
    }

    public function down(): void
    {
        Schema::dropIfExists('howlers');
    }
};
