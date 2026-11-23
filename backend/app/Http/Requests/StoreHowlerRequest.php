<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHowlerRequest extends FormRequest
{
    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            // "required" already rejects an empty or whitespace-only message (the framework trims input).
            'message' => ['required', 'string', 'max:140'],
            'recipient_name' => ['nullable', 'string', 'max:40'],
        ];
    }
}
