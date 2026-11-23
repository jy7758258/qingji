package com.qingji.backend.ledger.controller;

import com.qingji.backend.auth.model.AuthPrincipal;
import com.qingji.backend.ledger.dto.CategoryResponse;
import com.qingji.backend.ledger.dto.CreateTransactionRequest;
import com.qingji.backend.ledger.dto.TransactionResponse;
import com.qingji.backend.ledger.service.LedgerService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    private final LedgerService ledgerService;

    public LedgerController(LedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryResponse>> categories(@AuthenticationPrincipal AuthPrincipal principal) {
        return ResponseEntity.ok(ledgerService.categories(principal.userId()));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponse>> transactions(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ledgerService.transactions(principal.userId(), from, to));
    }

    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse> create(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateTransactionRequest request
    ) {
        return ResponseEntity.status(201).body(ledgerService.create(principal.userId(), request));
    }
}
