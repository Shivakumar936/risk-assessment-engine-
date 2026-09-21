package com.internship.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Returned by GET /api/risk-records/stats for dashboard KPI cards and analytics charts */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsResponse {
    private long total;
    private long totalRisks;             // frontend alias
    private long openCount;
    private long openRisks;              // frontend alias
    private long inProgressCount;
    private long closedCount;
    private long mitigated;              // frontend alias
    private Double averageRiskScore;
    private long highRiskCount;          // score >= 70
    private long highSeverity;           // frontend alias

    private List<CategoryCount> byCategory;
    private List<CategoryCount> byStatus;
    private List<CategoryCount> bySeverity;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryCount {
        private String name;
        private long count;
    }
}
